#!/usr/bin/env python3
"""Reconcile explicit, revision-bound SDD completion observations."""

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
    try:
        current_plan_digest = _sha256(Path(state["plan"]).read_bytes())
    except OSError as error:
        raise ReconciliationError(f"cannot read plan for progress state: {error}") from error
    if current_plan_digest != state["plan_sha256"]:
        raise ReconciliationError("plan content changed since progress state initialization")
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
    args = parser.parse_args()
    try:
        result = _result(initialize_state(args.state, args.plan, args.workspace, args.actions, args.revision, args.dirty_identity), False) if args.command == "init" else reconcile(args.state, args.observation)
    except (ReconciliationError, OSError) as error:
        sys.stderr.write(f"Error: {error}\n")
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
