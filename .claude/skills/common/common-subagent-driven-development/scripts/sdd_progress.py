#!/usr/bin/env python3
"""Reconcile revision-bound SDD completion observations and project them read-only."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile
from pathlib import Path
from typing import Any


class ReconciliationError(ValueError):
    """A receipt cannot safely advance the identified plan."""


def _canonical(path: str | Path) -> str:
    return str(Path(path).expanduser().resolve())


def _sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _validate_state(state: Any) -> dict[str, Any]:
    if not isinstance(state, dict) or state.get("version") != 2:
        raise ReconciliationError("unsupported or malformed state version")
    digest = state.get("plan_sha256")
    if (not isinstance(state.get("plan"), str) or not isinstance(digest, str) or len(digest) != 64
            or any(character not in "0123456789abcdef" for character in digest)
            or not isinstance(state.get("workspace"), str)
            or not isinstance(state.get("source_revision"), str) or not state["source_revision"]
            or not isinstance(state.get("dirty_identity"), str) or not state["dirty_identity"]):
        raise ReconciliationError("state must bind plan, workspace, source revision, and dirty identity")
    actions = state.get("actions")
    cursor = state.get("cursor")
    if (not isinstance(actions, list) or not actions or any(not isinstance(item, str) or not item.strip() for item in actions)
            or len(set(actions)) != len(actions) or not isinstance(cursor, int) or isinstance(cursor, bool)
            or not 0 <= cursor <= len(actions)):
        raise ReconciliationError("state actions or cursor are invalid")
    completions = state.get("completions")
    if not isinstance(completions, dict) or any(not isinstance(key, str) or not isinstance(value, dict) for key, value in completions.items()):
        raise ReconciliationError("state completions are invalid")
    if state.get("blocked") is not None and not isinstance(state["blocked"], dict):
        raise ReconciliationError("state blocked observation is invalid")
    return state


def _require_current_plan(state: dict[str, Any]) -> None:
    try:
        current_plan_digest = _sha256(Path(state["plan"]).read_bytes())
    except OSError as error:
        raise ReconciliationError(f"cannot read plan for progress state: {error}") from error
    if current_plan_digest != state["plan_sha256"]:
        raise ReconciliationError("plan content changed since progress state initialization")


def _atomic_write(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.is_symlink():
        raise ReconciliationError("state path must not be a symlink")
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, delete=False) as stream:
            temporary = Path(stream.name)
            stream.write(json.dumps(state, indent=2, sort_keys=True) + "\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(temporary, path)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def initialize_state(state_path: str | Path, plan: str | Path, workspace: str | Path,
                     actions: list[str], revision: str, dirty_identity: str) -> dict[str, Any]:
    state_file = Path(state_path)
    if state_file.exists() or state_file.is_symlink():
        raise ReconciliationError("refusing to overwrite existing state")
    if not revision.strip() or not dirty_identity.strip():
        raise ReconciliationError("revision and dirty identity are required")
    state = _validate_state({
        "version": 2, "plan": _canonical(plan), "plan_sha256": _sha256(Path(plan).read_bytes()),
        "workspace": _canonical(workspace), "source_revision": revision, "dirty_identity": dirty_identity,
        "actions": actions, "cursor": 0, "blocked": None, "completions": {},
    })
    _atomic_write(state_file, state)
    return state


def _read_json(path: Path, label: str) -> Any:
    try:
        with path.open(encoding="utf-8") as stream:
            return json.load(stream)
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise ReconciliationError(f"cannot read {label}: {error}") from error


def _validate_observation(state: dict[str, Any], value: Any) -> tuple[str, str, str, list[str], dict[str, Any]]:
    if not isinstance(value, dict):
        raise ReconciliationError("observation must be a JSON object")
    completion_id = value.get("completion_id")
    if not isinstance(completion_id, str) or not completion_id.strip():
        raise ReconciliationError("completion_id is required")
    if not isinstance(value.get("plan"), str) or not isinstance(value.get("workspace"), str) or _canonical(value["plan"]) != state["plan"] or _canonical(value["workspace"]) != state["workspace"]:
        raise ReconciliationError("observation plan/workspace identity does not match state")
    action_id = value.get("action_id")
    outcome = value.get("outcome")
    if not isinstance(action_id, str) or outcome not in ("completed", "blocked"):
        raise ReconciliationError("action_id or outcome is invalid")
    if value.get("verified_revision") != state["source_revision"] or value.get("current_revision") != state["source_revision"]:
        raise ReconciliationError("verified/current revision does not match initialized revision")
    if value.get("dirty_identity") != state["dirty_identity"]:
        raise ReconciliationError("dirty identity changed since initialization")
    if value.get("owner_paused") is not True:
        raise ReconciliationError("owner must declare paused before checkpoint reconciliation")
    owner = value.get("owner")
    if not isinstance(owner, str) or not owner.strip():
        raise ReconciliationError("responsible owner identity is required")
    evidence = value.get("evidence", [])
    if not isinstance(evidence, list) or any(not isinstance(item, str) for item in evidence):
        raise ReconciliationError("evidence must be a list of workspace-relative paths")
    if outcome == "completed" and not evidence:
        raise ReconciliationError("completed action requires evidence")
    if outcome == "blocked" and (not isinstance(value.get("blocked_reason"), str) or not value["blocked_reason"].strip()):
        raise ReconciliationError("blocked observation requires blocked_reason")
    digest = _sha256(json.dumps(value, sort_keys=True, separators=(",", ":")).encode())
    return completion_id, action_id, outcome, evidence, {"digest": digest, "observation": value, "owner": owner}


def _evidence_identities(workspace: str, evidence: list[str]) -> list[dict[str, str]]:
    root = Path(workspace).resolve(strict=True)
    result = []
    for item in evidence:
        relative = Path(item)
        if relative.is_absolute() or ".." in relative.parts or not item:
            raise ReconciliationError("evidence paths must remain inside workspace")
        try:
            resolved = (root / relative).resolve(strict=True)
            if not resolved.is_relative_to(root) or not resolved.is_file():
                raise ReconciliationError("evidence file escapes workspace or is not a file")
            result.append({"path": item, "sha256": _sha256(resolved.read_bytes())})
        except OSError as error:
            raise ReconciliationError(f"cannot read evidence file {item!r}: {error}") from error
    return result


def reconcile(state_path: str | Path, observation_path: str | Path) -> dict[str, Any]:
    state_file = Path(state_path)
    if state_file.is_symlink():
        raise ReconciliationError("state path must not be a symlink")
    state = _validate_state(_read_json(state_file, "state"))
    _require_current_plan(state)
    observation = _read_json(Path(observation_path), "completion observation")
    completion_id, action_id, outcome, evidence, identity = _validate_observation(state, observation)
    evidence_ids = _evidence_identities(state["workspace"], evidence)
    previous = state["completions"].get(completion_id)
    if previous is not None:
        if previous.get("digest") != identity["digest"] or previous.get("evidence") != evidence_ids:
            raise ReconciliationError("completion_id was reused with changed observation or evidence content")
        return _result(state, duplicate=True)
    if state["cursor"] >= len(state["actions"]):
        raise ReconciliationError("plan has no remaining owned action")
    expected = state["actions"][state["cursor"]]
    if action_id != expected:
        raise ReconciliationError(f"observation action {action_id!r} is not current action {expected!r}")
    timings = {key: observation.get(key) for key in (
        "human_wait_seconds", "worker_started_at", "worker_completed_at", "notification_delay_seconds"
    )}
    receipt = {"digest": identity["digest"], "action_id": action_id, "evidence": evidence_ids,
               "owner": identity["owner"], "timings": timings}
    if outcome == "blocked":
        state["blocked"] = {"completion_id": completion_id, "action_id": action_id, "reason": observation["blocked_reason"]}
        receipt["blocked_reason"] = observation["blocked_reason"]
    else:
        state["cursor"] += 1
        state["blocked"] = None
    state["completions"][completion_id] = receipt
    _atomic_write(state_file, state)
    return _result(state, duplicate=False)


def _result(state: dict[str, Any], duplicate: bool) -> dict[str, Any]:
    cursor = state["cursor"]
    return {"status": "complete" if cursor == len(state["actions"]) else ("blocked" if state["blocked"] else "ready"),
            "next_action": None if cursor == len(state["actions"]) else state["actions"][cursor],
            "cursor": cursor, "blocked": state["blocked"], "duplicate": duplicate,
            "source_revision": state["source_revision"], "dirty_identity": state["dirty_identity"]}


def _receipt_records(state: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    records = []
    for completion_id, receipt in state["completions"].items():
        action_id = receipt.get("action_id")
        owner = receipt.get("owner")
        evidence = receipt.get("evidence")
        blocked_reason = receipt.get("blocked_reason")
        if (not isinstance(action_id, str) or action_id not in state["actions"]
                or not isinstance(owner, str) or not owner.strip()
                or not isinstance(evidence, list)
                or any(not isinstance(item, dict) or not isinstance(item.get("path"), str)
                       or not isinstance(item.get("sha256"), str) for item in evidence)
                or (blocked_reason is not None and not isinstance(blocked_reason, str))):
            raise ReconciliationError(f"state completion receipt {completion_id!r} is invalid")
        if blocked_reason is None and not evidence:
            raise ReconciliationError(f"state completion receipt {completion_id!r} records completion without evidence")
        records.append((completion_id, receipt))
    return records


def _current_evidence(workspace: str, refs: list[dict[str, str]], action_id: str) -> list[dict[str, Any]]:
    try:
        current = _evidence_identities(workspace, [ref["path"] for ref in refs])
    except ReconciliationError as error:
        raise ReconciliationError(f"action {action_id!r} evidence is not current: {error}") from error
    result = []
    for ref, identity in zip(refs, current):
        if identity["sha256"] != ref["sha256"]:
            raise ReconciliationError(
                f"action {action_id!r} evidence {ref['path']!r} changed since its recorded checkpoint")
        result.append({"path": ref["path"], "sha256": ref["sha256"], "current": True})
    return result


def _history(records: list[tuple[str, dict[str, Any]]], excluded: str | None) -> list[dict[str, Any]]:
    return [{"completion_id": completion_id, "action_id": receipt["action_id"],
             "checkpoint_status": "blocked", "owner": receipt["owner"],
             "reason": receipt["blocked_reason"]}
            for completion_id, receipt in records
            if "blocked_reason" in receipt and completion_id != excluded]


def _current_block(state: dict[str, Any]) -> dict[str, str] | None:
    block = state.get("blocked")
    if block is None:
        return None
    completion_id = block.get("completion_id")
    action_id = block.get("action_id")
    reason = block.get("reason")
    actions = state["actions"]
    cursor = state["cursor"]
    receipt = state["completions"].get(completion_id) if isinstance(completion_id, str) else None
    if (cursor >= len(actions) or not isinstance(completion_id, str) or action_id != actions[cursor]
            or not isinstance(reason, str) or not reason.strip()
            or receipt is None or receipt.get("action_id") != actions[cursor]
            or not isinstance(receipt.get("blocked_reason"), str) or not receipt["blocked_reason"].strip()
            or receipt["blocked_reason"] != reason):
        raise ReconciliationError("state current block disagrees with its completion receipt")
    return {"completion_id": completion_id, "action_id": action_id, "reason": reason}


def _project_actions(state: dict[str, Any], block: dict[str, str] | None) -> list[dict[str, Any]]:
    actions = state["actions"]
    cursor = state["cursor"]
    records = _receipt_records(state)
    projection = []
    for index, action_id in enumerate(actions):
        own = [(completion_id, receipt) for completion_id, receipt in records if receipt["action_id"] == action_id]
        completed = [(completion_id, receipt) for completion_id, receipt in own if "blocked_reason" not in receipt]
        if index < cursor:
            if len(completed) != 1:
                raise ReconciliationError(
                    f"action {action_id!r} before the cursor lacks exactly one completed receipt")
            receipt = completed[0][1]
            status = "completed"
        elif index == cursor and block is not None:
            if completed:
                raise ReconciliationError(f"action {action_id!r} has a completion receipt without cursor advance")
            completion_id = block["completion_id"]
            receipt = state["completions"][completion_id]
            status = "blocked"
        else:
            if completed:
                raise ReconciliationError(f"action {action_id!r} has a completion receipt beyond the cursor")
            if any("blocked_reason" in item for _, item in own):
                raise ReconciliationError(f"action {action_id!r} has a blocked receipt without an active block")
            projection.append({"id": action_id, "checkpoint_status": "pending", "owner": None,
                               "evidence": [], "history": [], "blocked_reason": None})
            continue
        evidence = _current_evidence(state["workspace"], receipt["evidence"], action_id)
        excluded = block["completion_id"] if status == "blocked" else None
        projection.append({
            "id": action_id, "checkpoint_status": status, "owner": receipt["owner"], "evidence": evidence,
            "history": _history(own, excluded),
            "blocked_reason": receipt.get("blocked_reason"),
        })
    return projection


_LIMITATIONS = (
    "checkpoint completion is not technical verification, business acceptance, or release",
    "caller-supplied revision and dirty identity are declarations, not authenticated provenance",
    "recorded owner and owner_paused values are declarations and are not independently authenticated",
    "no approval is inferred from a checkpoint receipt, filename, status string, or reviewer attribution",
    "historical blocked receipts are retained as history and their evidence is not revalidated",
    "evidence freshness is a local byte comparison and does not prove an external system observed the event",
)


def inspect_state(state_path: str | Path, revision: str, dirty_identity: str) -> dict[str, Any]:
    state_file = Path(state_path)
    if state_file.is_symlink():
        raise ReconciliationError("state path must not be a symlink")
    if not isinstance(revision, str) or not revision.strip() or not isinstance(dirty_identity, str) or not dirty_identity.strip():
        raise ReconciliationError("caller-observed source revision and dirty identity are required")
    state = _validate_state(_read_json(state_file, "state"))
    if revision != state["source_revision"]:
        raise ReconciliationError(f"caller revision {revision!r} does not match the recorded source revision")
    if dirty_identity != state["dirty_identity"]:
        raise ReconciliationError("caller dirty identity does not match the recorded dirty identity")
    _require_current_plan(state)
    block = _current_block(state)
    actions = _project_actions(state, block)
    return {"state_version": state["version"],
            "plan": {"path": state["plan"], "sha256": state["plan_sha256"], "current": True},
            "source_revision": state["source_revision"], "dirty_identity": state["dirty_identity"],
            "actions": actions, "next_action": state["actions"][state["cursor"]] if state["cursor"] < len(state["actions"]) else None,
            "blocked": block,
            "checkpoint_completion": "complete" if state["cursor"] == len(state["actions"]) else "incomplete",
            "evidence_current": True, "limitations": list(_LIMITATIONS)}


def _quote(value: Any) -> str:
    text = str(value).replace("`", "'").replace("|", "\\|").replace("\r", " ").replace("\n", " ")
    return f"`{text}`"


def render_markdown(projection: dict[str, Any]) -> str:
    plan = projection["plan"]
    lines = ["# SDD checkpoint status", "",
             f"- State version: {projection['state_version']}",
             f"- Plan: {_quote(plan['path'])} sha256 {_quote(plan['sha256'])}",
             f"- Source revision: {_quote(projection['source_revision'])}",
             f"- Dirty identity: {_quote(projection['dirty_identity'])}",
             f"- Checkpoint completion: {_quote(projection['checkpoint_completion'])}",
             f"- Evidence current: {_quote('yes' if projection['evidence_current'] else 'no')}",
             "", "| # | Action | Checkpoint | Owner | Evidence |", "| --- | --- | --- | --- | --- |"]
    for index, action in enumerate(projection["actions"], start=1):
        owner = _quote(action["owner"]) if action["owner"] else "not recorded"
        evidence = "<br>".join(_quote(item["path"]) for item in action["evidence"]) or "none"
        lines.append(f"| {index} | {_quote(action['id'])} | {_quote(action['checkpoint_status'])} | {owner} | {evidence} |")
    lines.append("")
    if projection["blocked"] is not None:
        blocked = projection["blocked"]
        lines.append(f"Blocked action: {_quote(blocked['action_id'])} reason {_quote(blocked['reason'])}")
    else:
        next_action = projection["next_action"]
        lines.append(f"Next action: {_quote(next_action) if next_action else 'none'}")
    history = [entry for action in projection["actions"] for entry in action["history"]]
    if history:
        lines.extend(["", "## Earlier blocked receipts (history, not current success)", ""])
        lines.extend(f"- {_quote(entry['completion_id'])} on {_quote(entry['action_id'])}: {_quote(entry['reason'])}"
                     for entry in history)
    lines.extend(["", "## Limitations", ""])
    lines.extend(f"- {limitation}" for limitation in projection["limitations"])
    return "\n".join(lines) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init", help="create durable plan/workspace/revision-bound state")
    init.add_argument("--state", required=True)
    init.add_argument("--plan", required=True)
    init.add_argument("--workspace", required=True)
    init.add_argument("--actions", nargs="+", required=True)
    init.add_argument("--revision", required=True)
    init.add_argument("--dirty-identity", required=True)
    apply = commands.add_parser("reconcile", help="apply one explicit completion observation")
    apply.add_argument("--state", required=True)
    apply.add_argument("--observation", required=True)
    status = commands.add_parser("status", help="print a read-only current-state projection")
    status.add_argument("--state", required=True)
    status.add_argument("--revision", required=True)
    status.add_argument("--dirty-identity", required=True)
    status.add_argument("--format", choices=("json", "markdown"), default="json")
    args = parser.parse_args()
    try:
        if args.command == "status":
            projection = inspect_state(args.state, args.revision, args.dirty_identity)
        else:
            result = _result(initialize_state(args.state, args.plan, args.workspace, args.actions, args.revision, args.dirty_identity), False) if args.command == "init" else reconcile(args.state, args.observation)
    except (ReconciliationError, OSError) as error:
        sys.stderr.write(f"Error: {error}\n")
        return 2
    if args.command == "status":
        sys.stdout.write(render_markdown(projection) if args.format == "markdown"
                         else json.dumps(projection, indent=2, sort_keys=True) + "\n")
        return 0
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
