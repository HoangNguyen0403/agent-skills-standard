#!/usr/bin/env python3
"""task_brief.py - Publish a standalone, validated assignment packet for one plan task.

Usage:
    task_brief.py <PLAN_FILE> <TASK_NUMBER> --assignment <ASSIGNMENT_JSON> [--out <BRIEF_FILE>]

The explicit assignment manifest is mandatory: the helper validates structure and
content identity (plan, source and dependency digests) before publishing. It does
not authenticate human approval, sandbox the worker or verify host file access.

Exit codes: 0 packet published/reused, 2 invalid/stale/missing prerequisite,
3 absent/ambiguous task selection or output collision.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sdd_workspace import get_git_root, resolve_workspace

EXIT_INVALID = 2
EXIT_SELECTION = 3

SCHEMA_VERSION = 1
REQUIRED_KEYS = (
    "schema_version",
    "task_id",
    "task_number",
    "goal",
    "owner",
    "project_domain",
    "workspace_root",
    "plan_sha256",
    "non_goals",
    "authority",
    "global_invariants",
    "owned_paths",
    "acceptance_criteria",
    "verification",
    "required_standards",
    "source_revision",
    "dirty_identity",
    "source_files",
    "dependencies",
    "output_contract",
    "limits",
)

TASK_HEADER = re.compile(r"^\s{0,3}(#{1,6})\s+Task\s+(\d+)\b", re.IGNORECASE)
SECTION_HEADER = re.compile(r"^\s{0,3}(#{1,6})\s+")
FENCE_HEADER = re.compile(r"^\s{0,3}(`{3,}|~{3,})(.*)$")
HEX64 = re.compile(r"^[0-9a-f]{64}$")


class PacketError(Exception):
    """A rejected assignment or selection with a contract exit code."""

    def __init__(self, code: int, message: str) -> None:
        super().__init__(message)
        self.code = code


def fail(code: int, message: str):
    raise PacketError(code, message)


def field_error(key: str, requirement: str):
    fail(EXIT_INVALID, f"invalid assignment: field '{key}' {requirement}")


# -- validation primitives ------------------------------------------------


def require_mapping(container: dict, key: str, *, allow_empty: bool = False) -> dict:
    value = container.get(key)
    if not isinstance(value, dict):
        field_error(key, "must be an object")
    if not value and not allow_empty:
        field_error(key, "must be non-empty")
    return value


def text(value, key: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        field_error(key, "must be a string")
    if not allow_empty and not value.strip():
        field_error(key, "must be a non-empty string")
    return value


def text_list(value, key: str, *, allow_empty: bool = False) -> list[str]:
    if not isinstance(value, list):
        field_error(key, "must be a list")
    if not value and not allow_empty:
        field_error(key, "must be a non-empty list")
    return [text(item, key) for item in value]


def object_list(value, key: str, *, allow_empty: bool = False) -> list[dict]:
    if not isinstance(value, list):
        field_error(key, "must be a list")
    if not value and not allow_empty:
        field_error(key, "must be a non-empty list")
    for item in value:
        if not isinstance(item, dict):
            field_error(key, "entries must be objects")
    return value


def require_identity(value, key: str):
    if isinstance(value, str):
        return text(value, key)
    if isinstance(value, dict) and value:
        return value
    field_error(key, "must be a non-empty string or object")


def require_digest(value, key: str) -> str:
    if not isinstance(value, str) or not HEX64.match(value.lower()):
        field_error(key, "must be a 64-character SHA-256 hex digest")
    return value.lower()


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read_bytes(path: str, label: str) -> bytes:
    try:
        with open(path, "rb") as stream:
            return stream.read()
    except OSError as error:
        fail(EXIT_INVALID, f"{label} is unreadable: {path}: {error}")


def is_within(root_real: str, candidate_real: str) -> bool:
    try:
        return os.path.commonpath([root_real, candidate_real]) == root_real
    except ValueError:
        return False


def ensure_output_within(root_real: str, path: str) -> None:
    absolute = os.path.abspath(path)
    real = os.path.realpath(absolute)
    if real == root_real or not is_within(root_real, real):
        fail(EXIT_INVALID, f"output path '{absolute}' resolves outside workspace_root")


def preflight_artifact_root(root_real: str, plan_file: str) -> None:
    """Reject the resolver's would-be artifact root before it mutates the filesystem.

    resolve_workspace() derives the Git root from the current working directory and
    creates .agent/sdd plus ownership markers before returning. Resolve the same
    candidate root, including existing ancestor symlinks, and require containment.
    """
    git_root = get_git_root()
    base_dir = os.path.join(git_root, ".agent", "sdd")
    base_real = os.path.realpath(base_dir)
    if not is_within(root_real, base_real):
        fail(EXIT_INVALID, f"cannot resolve packet workspace for '{plan_file}': "
                           f"artifact root '{base_dir}' resolves outside workspace_root")


def resolve_path(root_real: str, relative: str, key: str, *, allow_root: bool = False,
                 must_exist: bool = False, is_dir: bool | None = None) -> str:
    text(relative, key)
    if "://" in relative:
        fail(EXIT_INVALID, f"invalid assignment: field '{key}' uses an unsupported remote reference: {relative}")
    joined = relative if os.path.isabs(relative) else os.path.join(root_real, relative)
    real = os.path.realpath(joined)
    if not is_within(root_real, real) or (real == root_real and not allow_root):
        fail(EXIT_INVALID, f"invalid assignment: field '{key}' path '{relative}' resolves outside workspace_root")
    if must_exist and not os.path.exists(real):
        fail(EXIT_INVALID, f"invalid assignment: field '{key}' path '{relative}' does not exist")
    if is_dir is True and not os.path.isdir(real):
        fail(EXIT_INVALID, f"invalid assignment: field '{key}' path '{relative}' is not a directory")
    if is_dir is False and not os.path.isfile(real):
        fail(EXIT_INVALID, f"invalid assignment: field '{key}' path '{relative}' is not a regular file")
    return real


# -- assignment validation ------------------------------------------------


def load_assignment(path: str) -> dict:
    try:
        with open(path, encoding="utf-8") as stream:
            data = json.load(stream)
    except FileNotFoundError:
        fail(EXIT_INVALID, f"assignment file not found: {path}")
    except json.JSONDecodeError as error:
        fail(EXIT_INVALID, f"assignment file is not valid JSON: {path}: {error}")
    except (OSError, UnicodeDecodeError) as error:
        fail(EXIT_INVALID, f"assignment file unreadable: {path}: {error}")
    if not isinstance(data, dict):
        fail(EXIT_INVALID, "assignment must be a JSON object")
    return data


def validate_owned_path(entry: str, root_real: str) -> str:
    normalized = entry.replace("\\", "/").strip()
    segments = normalized.rstrip("/").split("/")
    if (not normalized or normalized == "." or os.path.isabs(entry)
            or any(part in ("", ".", "..") for part in segments)):
        field_error("owned_paths", f"entry '{entry}' is repository-wide, absolute or escaping")
    if any(char in normalized for char in "*?[]"):
        field_error("owned_paths", f"entry '{entry}' uses ambiguous glob characters")
    normalized = normalized.rstrip("/")
    resolved = os.path.realpath(os.path.join(root_real, normalized))
    if resolved == root_real or not is_within(root_real, resolved):
        field_error("owned_paths", f"entry '{entry}' resolves outside workspace_root")
    return normalized


def validate_source_file(item: dict, root_real: str) -> dict:
    declared_path = text(item.get("path"), "source_files.path")
    real = resolve_path(root_real, declared_path, "source_files.path")
    if "sha256" in item:
        declared = require_digest(item["sha256"], "source_files.sha256")
        if not os.path.isfile(real):
            fail(EXIT_INVALID, f"invalid assignment: source file '{declared_path}' is missing but a digest was declared")
        actual = sha256_bytes(read_bytes(real, f"source file '{declared_path}'"))
        if actual != declared:
            fail(EXIT_INVALID, f"invalid assignment: source file '{declared_path}' SHA-256 digest mismatch: "
                               f"declared {declared} != actual {actual}")
        return {"path": declared_path, "sha256": declared}
    if "state" in item:
        state = text(item["state"], "source_files.state")
        if state not in ("new", "missing"):
            field_error("source_files.state", "must be 'new' or 'missing'")
        if os.path.exists(real):
            fail(EXIT_INVALID, f"invalid assignment: source file '{declared_path}' declared '{state}' but exists")
        return {"path": declared_path, "state": state}
    field_error("source_files", "entries need 'sha256' or an explicit 'state'")
    return {}


def parse_receipt(raw: bytes, declared_path: str, artifact: str) -> dict:
    try:
        payload = json.loads(raw.decode("utf-8"))
    except UnicodeDecodeError:
        fail(EXIT_INVALID, f"unsupported dependency evidence: '{declared_path}' is not UTF-8 text")
    except json.JSONDecodeError:
        fail(EXIT_INVALID, f"unsupported dependency evidence: '{declared_path}' is not a JSON receipt with content identity")
    if not isinstance(payload, dict):
        fail(EXIT_INVALID, f"unsupported dependency evidence: '{declared_path}' receipt is not an object")
    return payload


def validate_dependency(item: dict, root_real: str) -> dict:
    artifact = text(item.get("artifact_id"), "dependencies.artifact_id")
    producer = text(item.get("producer_task"), "dependencies.producer_task")
    required_revision = text(item.get("required_revision"), "dependencies.required_revision")
    declared_path = text(item.get("evidence_path"), "dependencies.evidence_path")
    declared = require_digest(item.get("sha256"), "dependencies.sha256")
    real = resolve_path(root_real, declared_path, "dependencies.evidence_path", must_exist=True, is_dir=False)
    raw = read_bytes(real, f"dependency '{artifact}' evidence '{declared_path}'")
    actual = sha256_bytes(raw)
    if actual != declared:
        fail(EXIT_INVALID, f"invalid assignment: dependency '{artifact}' evidence '{declared_path}' "
                           f"SHA-256 digest mismatch: declared {declared} != actual {actual}")
    receipt = parse_receipt(raw, declared_path, artifact)
    revision = text(receipt.get("revision"), "dependencies.revision")
    body = text(receipt.get("body"), "dependencies.body")
    if receipt.get("artifact_id") not in (None, artifact) or receipt.get("producer_task") not in (None, producer):
        fail(EXIT_INVALID, f"invalid assignment: dependency '{artifact}' receipt identity does not match the declaration")
    if revision != required_revision:
        fail(EXIT_INVALID, f"invalid assignment: dependency '{artifact}' receipt revision '{revision}' "
                           f"does not match required revision '{required_revision}'")
    return {
        "artifact_id": artifact,
        "producer_task": producer,
        "required_revision": required_revision,
        "revision": revision,
        "evidence_path": declared_path,
        "sha256": actual,
        "body": body,
    }


def validate_criteria(value, key: str) -> list[dict]:
    normalized = []
    for item in object_list(value, key):
        normalized.append({
            "id": text(item.get("id"), f"{key}.id"),
            "expectation": text(item.get("expectation"), f"{key}.expectation"),
        })
    return normalized


def validate_verification(value, root_real: str) -> list[dict]:
    normalized = []
    for item in object_list(value, "verification"):
        step = {
            "command": text(item.get("command"), "verification.command"),
            "cwd": text(item.get("cwd"), "verification.cwd"),
            "expected": text(item.get("expected"), "verification.expected"),
        }
        resolve_path(root_real, step["cwd"], "verification.cwd", allow_root=True)
        normalized.append(step)
    return normalized


def validate_standards(value, root_real: str) -> list[dict]:
    normalized = []
    for item in object_list(value, "required_standards", allow_empty=True):
        standard = {
            "id": text(item.get("id"), "required_standards.id"),
            "path": text(item.get("path"), "required_standards.path"),
            "revision": text(item.get("revision"), "required_standards.revision"),
        }
        resolve_path(root_real, standard["path"], "required_standards.path", must_exist=True, is_dir=False)
        normalized.append(standard)
    return normalized


def validate_limits(data: dict) -> dict:
    limits = require_mapping(data, "limits")
    if "status" in limits:
        status = text(limits.get("status"), "limits.status")
        if status not in ("unavailable", "advisory"):
            field_error("limits.status", "must be 'unavailable' or 'advisory' when a status is declared")
        return limits
    concrete = [
        value for value in limits.values()
        if isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0
    ]
    if not concrete:
        field_error("limits", "must declare a concrete numeric resource/attempt limit "
                              "or an explicit 'unavailable'/'advisory' status")
    return limits


def validate_assignment(data: dict, task_number: int, plan_digest: str) -> dict:
    for key in REQUIRED_KEYS:
        if key not in data:
            field_error(key, "is required")
    version = data["schema_version"]
    if isinstance(version, bool) or version != SCHEMA_VERSION:
        field_error("schema_version", f"must be {SCHEMA_VERSION}")
    declared_number = data["task_number"]
    if isinstance(declared_number, bool) or not isinstance(declared_number, int) or declared_number < 0:
        field_error("task_number", "must be a nonnegative integer")
    if declared_number != task_number:
        field_error("task_number", f"({declared_number}) does not match the requested task ({task_number})")

    workspace_root = text(data["workspace_root"], "workspace_root")
    if not os.path.isabs(workspace_root):
        field_error("workspace_root", "must be an absolute path")
    root_real = os.path.realpath(workspace_root)
    if not os.path.isdir(root_real):
        field_error("workspace_root", "must be an existing directory")
    declared_plan = require_digest(data["plan_sha256"], "plan_sha256")
    if declared_plan != plan_digest:
        fail(EXIT_INVALID, f"invalid assignment: plan_sha256 digest mismatch: "
                           f"declared {declared_plan} != actual {plan_digest}")

    authority = require_mapping(data, "authority")
    allowed = text_list(authority.get("allowed_operations"), "authority.allowed_operations")
    forbidden = text_list(authority.get("forbidden_actions"), "authority.forbidden_actions")
    approvals = text_list(authority.get("required_approvals"), "authority.required_approvals", allow_empty=True)

    output_contract = require_mapping(data, "output_contract")
    limits = validate_limits(data)
    return {
        "task_id": text(data["task_id"], "task_id"),
        "task_number": declared_number,
        "goal": text(data["goal"], "goal"),
        "owner": text(data["owner"], "owner"),
        "project_domain": text(data["project_domain"], "project_domain"),
        "workspace_root": workspace_root,
        "root_real": root_real,
        "non_goals": text_list(data["non_goals"], "non_goals", allow_empty=True),
        "authority": {
            "allowed_operations": allowed,
            "forbidden_actions": forbidden,
            "required_approvals": approvals,
        },
        "global_invariants": text_list(data["global_invariants"], "global_invariants", allow_empty=True),
        "owned_paths": [validate_owned_path(entry, root_real) for entry in text_list(data["owned_paths"], "owned_paths")],
        "acceptance_criteria": validate_criteria(data["acceptance_criteria"], "acceptance_criteria"),
        "verification": validate_verification(data["verification"], root_real),
        "required_standards": validate_standards(data["required_standards"], root_real),
        "source_revision": require_identity(data["source_revision"], "source_revision"),
        "dirty_identity": require_identity(data["dirty_identity"], "dirty_identity"),
        "source_files": [validate_source_file(item, root_real) for item in
                         object_list(data["source_files"], "source_files", allow_empty=True)],
        "dependencies": [validate_dependency(item, root_real) for item in
                         object_list(data["dependencies"], "dependencies", allow_empty=True)],
        "output_contract": {
            "receipt_destination": text(output_contract.get("receipt_destination"),
                                        "output_contract.receipt_destination"),
            "status_vocabulary": text_list(output_contract.get("status_vocabulary"),
                                           "output_contract.status_vocabulary"),
            "stop_conditions": text_list(output_contract.get("stop_conditions"),
                                         "output_contract.stop_conditions"),
        },
        "limits": limits,
        "plan_sha256": plan_digest,
    }


# -- task section selection ----------------------------------------------


def _fence_state(line: str, in_fence: bool, fence_char: str, fence_len: int):
    match = FENCE_HEADER.match(line)
    if in_fence:
        if (match and match.group(1)[0] == fence_char and len(match.group(1)) >= fence_len
                and not match.group(2).strip()):
            return False, fence_char, fence_len
        return True, fence_char, fence_len
    if match:
        return True, match.group(1)[0], len(match.group(1))
    return False, fence_char, fence_len


def extract_task_section(plan_text: str, task_number: int) -> str:
    lines = plan_text.splitlines(keepends=True)
    in_fence, fence_char, fence_len = False, "", 0
    matches: list[tuple[int, int]] = []
    for index, line in enumerate(lines):
        in_fence, fence_char, fence_len = _fence_state(line.rstrip("\n"), in_fence, fence_char, fence_len)
        if in_fence:
            continue
        header = TASK_HEADER.match(line.rstrip("\n"))
        if header and int(header.group(2)) == task_number:
            matches.append((index, len(header.group(1))))
    if not matches:
        fail(EXIT_SELECTION, f"task {task_number} not found in plan (no H1-H6 'Task {task_number}' heading)")
    if len(matches) > 1:
        fail(EXIT_SELECTION, f"ambiguous task {task_number}: {len(matches)} headings match")
    start, depth = matches[0]
    end = len(lines)
    in_fence, fence_char, fence_len = False, "", 0
    for index in range(start + 1, len(lines)):
        line = lines[index].rstrip("\n")
        in_fence, fence_char, fence_len = _fence_state(line, in_fence, fence_char, fence_len)
        if in_fence:
            continue
        if TASK_HEADER.match(line):
            end = index
            break
        section = SECTION_HEADER.match(line)
        if section and len(section.group(1)) <= depth:
            end = index
            break
    return "".join(lines[start:end]).rstrip() + "\n"


# -- packet rendering -----------------------------------------------------


def format_value(value) -> str:
    if isinstance(value, str):
        return value
    return json.dumps(value, ensure_ascii=False, sort_keys=True)


def render_bullets(title: str, values: list[str]) -> list[str]:
    lines = [f"## {title}", ""]
    if not values:
        lines.append("- None declared (explicit empty list).")
    else:
        lines.extend(f"- {value}" for value in values)
    return lines + [""]


def render_mapping(title: str, mapping: dict) -> list[str]:
    lines = [f"## {title}", ""]
    lines.extend(f"- {key}: {format_value(value)}" for key, value in mapping.items())
    return lines + [""]


def build_packet(assignment: dict, plan_path: str, task_text: str) -> str:
    authority = assignment["authority"]
    lines = [
        f"# Assignment packet: {assignment['task_id']}",
        "",
        f"- Plan: {os.path.abspath(plan_path)}",
        f"- Plan SHA-256: {assignment['plan_sha256']}",
        f"- Task number: {assignment['task_number']}",
        f"- Project domain: {assignment['project_domain']}",
        f"- Workspace root: {assignment['workspace_root']}",
        "",
        "## Goal",
        "",
        assignment["goal"],
        "",
        "## Owner",
        "",
        assignment["owner"],
        "",
    ]
    lines += render_bullets("Authority: allowed operations", authority["allowed_operations"])
    lines += render_bullets("Authority: forbidden actions", authority["forbidden_actions"])
    lines += render_bullets("Authority: required approvals", authority["required_approvals"])
    lines += render_bullets("Global invariants", assignment["global_invariants"])
    lines += render_bullets("Non-goals", assignment["non_goals"])
    lines += render_bullets("Owned paths", assignment["owned_paths"])

    lines += ["## Acceptance criteria", ""]
    lines.extend(f"- **{item['id']}**: {item['expectation']}" for item in assignment["acceptance_criteria"])
    lines += [""]

    lines += ["## Verification", ""]
    for step in assignment["verification"]:
        lines.extend([f"- cwd: {step['cwd']}", f"  command: {step['command']}",
                      f"  expected: {step['expected']}"])
    lines += [""]

    standards = [f"{item['id']} ({item['path']}, revision {item['revision']})"
                 for item in assignment["required_standards"]]
    lines += render_bullets("Required standards", standards)
    sources = [f"{item['path']} ({'SHA-256 ' + item['sha256'] if 'sha256' in item else 'state: ' + item['state']})"
               for item in assignment["source_files"]]
    lines += render_bullets("Source files", sources)

    if isinstance(assignment["source_revision"], dict):
        lines += render_mapping("Source revision", assignment["source_revision"])
    else:
        lines += render_bullets("Source revision", [assignment["source_revision"]])
    if isinstance(assignment["dirty_identity"], dict):
        lines += render_mapping("Dirty identity", assignment["dirty_identity"])
    else:
        lines += render_bullets("Dirty identity", [assignment["dirty_identity"]])

    lines += ["## Dependencies", ""]
    if not assignment["dependencies"]:
        lines += ["- None declared (explicit empty list).", ""]
    for dependency in assignment["dependencies"]:
        lines += [
            f"### {dependency['artifact_id']} (producer {dependency['producer_task']}, "
            f"revision {dependency['revision']})",
            "",
            f"- Evidence: {dependency['evidence_path']} (SHA-256 {dependency['sha256']})",
            "",
            "Receipt body:",
            "",
            "```text",
            dependency["body"],
            "```",
            "",
        ]

    contract = assignment["output_contract"]
    lines += render_bullets("Output contract: receipt destination", [contract["receipt_destination"]])
    lines += render_bullets("Output contract: status vocabulary", contract["status_vocabulary"])
    lines += render_bullets("Output contract: stop conditions", contract["stop_conditions"])
    lines += render_mapping("Limits", assignment["limits"])

    lines += ["## Selected task text", "", task_text]
    return "\n".join(lines).rstrip("\n") + "\n"


# -- publication ----------------------------------------------------------


def read_existing(path: str):
    if not os.path.exists(path):
        return None
    if os.path.islink(path) or not os.path.isfile(path):
        fail(EXIT_SELECTION, f"output collision: {path} exists and is not a regular file")
    try:
        with open(path, encoding="utf-8") as stream:
            return stream.read()
    except UnicodeDecodeError:
        fail(EXIT_SELECTION, f"output collision: {path} exists with non-UTF-8 content")
    except OSError as error:
        fail(EXIT_INVALID, f"cannot read existing output '{path}': {error}")
    return None


def publish(path: str, content: str) -> tuple[str, bool]:
    absolute = os.path.abspath(path)
    directory = os.path.dirname(absolute)
    try:
        os.makedirs(directory, exist_ok=True)
    except OSError as error:
        fail(EXIT_INVALID, f"cannot create packet directory '{directory}': {error}")
    existing = read_existing(absolute)
    if existing is not None:
        if existing != content:
            fail(EXIT_SELECTION, f"output collision: {absolute} exists with different packet content")
        return absolute, True
    temporary_path = None
    try:
        try:
            with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=directory, delete=False) as stream:
                temporary_path = stream.name
                stream.write(content)
        except OSError as error:
            fail(EXIT_INVALID, f"cannot write packet in '{directory}': {error}")
        try:
            os.link(temporary_path, absolute)
        except FileExistsError:
            existing = read_existing(absolute)
            if existing != content:
                fail(EXIT_SELECTION, f"output collision: {absolute} exists with different packet content")
            return absolute, True
        except OSError as error:
            fail(EXIT_INVALID, f"cannot publish packet '{absolute}': {error}")
    finally:
        if temporary_path:
            try:
                os.unlink(temporary_path)
            except FileNotFoundError:
                pass
            except OSError:
                pass
    return absolute, False


# -- CLI ------------------------------------------------------------------


def parse_args(argv=None):
    parser = argparse.ArgumentParser(
        prog="task_brief.py",
        description="Publish a validated standalone assignment packet for one plan task.",
    )
    parser.add_argument("plan_file", help="implementation plan Markdown file")
    parser.add_argument("task_number", help="nonnegative task number selected from the plan")
    parser.add_argument("--assignment", required=True, help="explicit assignment manifest (v1 JSON)")
    parser.add_argument("--out", help="explicit packet path within the assigned workspace boundary")
    return parser.parse_args(argv)


def main(argv=None) -> int:
    args = parse_args(argv)
    try:
        task_number = int(args.task_number)
    except ValueError:
        fail(EXIT_INVALID, f"task number must be an integer, got: {args.task_number}")
    if task_number < 0:
        fail(EXIT_INVALID, f"task number must be nonnegative, got: {task_number}")
    if not os.path.isfile(args.plan_file):
        fail(EXIT_INVALID, f"plan file not found: {args.plan_file}")
    raw_plan = read_bytes(args.plan_file, "plan file")
    try:
        plan_text = raw_plan.decode("utf-8")
    except UnicodeDecodeError:
        fail(EXIT_INVALID, f"plan file is not valid UTF-8: {args.plan_file}")
    plan_digest = sha256_bytes(raw_plan)

    assignment = validate_assignment(load_assignment(args.assignment), task_number, plan_digest)
    task_text = extract_task_section(plan_text, task_number)
    content = build_packet(assignment, args.plan_file, task_text)
    packet_digest = hashlib.sha256(content.encode("utf-8")).hexdigest()

    if args.out:
        output_path = os.path.abspath(args.out)
    else:
        preflight_artifact_root(assignment["root_real"], args.plan_file)
        try:
            workspace_dir = resolve_workspace(args.plan_file, authorized_root=assignment["root_real"])
        except OSError as error:
            fail(EXIT_INVALID, f"cannot resolve packet workspace for '{args.plan_file}': {error}")
        if not is_within(assignment["root_real"], os.path.realpath(workspace_dir)):
            fail(EXIT_INVALID, f"resolved packet workspace '{workspace_dir}' resolves outside workspace_root")
        output_path = os.path.join(workspace_dir, f"task-{task_number}-{packet_digest[:12]}.md")
    ensure_output_within(assignment["root_real"], output_path)

    absolute, reused = publish(output_path, content)
    state = "reused" if reused else "wrote"
    print(f"{state} {absolute}: {len(content.splitlines())} lines sha256={packet_digest}")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except PacketError as error:
        sys.stderr.write(f"Error: {error}\n")
        sys.exit(error.code)
