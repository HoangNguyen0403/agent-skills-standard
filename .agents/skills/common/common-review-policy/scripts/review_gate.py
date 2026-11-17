#!/usr/bin/env python3
"""Descriptive, read-only review classification and report consistency checker."""
from __future__ import annotations

import argparse
import base64
import difflib
import hashlib
import json
import os
import re
import stat
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any

GATE_PATH = "skills/common/common-review-policy/scripts/review_gate.py"
CONTROL_PATHS = frozenset({"docs/review-policy.md", GATE_PATH, "CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS", ".skills-lock.json", "skills/metadata.json", "skills/index.json", "skills/README.md"})
CODEOWNERS = frozenset({"CODEOWNERS", ".github/CODEOWNERS", "docs/CODEOWNERS"})
RESULTS = frozenset({"PASS", "FAIL", "NOT RUN", "BLOCKED", "NOT APPLICABLE"})
SEVERITIES = frozenset({"Blocker", "Major", "Nit"})
PREVENT_BY = frozenset({"lint", "type", "test", "eval", "runtime", "guidance", "none"})
HEX = re.compile(r"^(?:[0-9a-f]{40}|[0-9a-f]{64})$")
PLACEHOLDER = re.compile(r"<[^<>]*>")


def _has_placeholder(value: str) -> bool:
    return PLACEHOLDER.search(value) is not None

class GateError(Exception):
    def __init__(self, code: str, message: str, status: int = 2) -> None:
        super().__init__(message)
        self.code, self.status = code, status


@dataclass(frozen=True)
class Entry:
    mode: str
    kind: str
    oid: str
    data: bytes


def _git(args: list[str], *, cwd: Path, input_bytes: bytes | None = None) -> bytes:
    env = {key: value for key, value in os.environ.items() if not key.startswith("GIT_")}
    env.update({"GIT_OPTIONAL_LOCKS": "0", "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull,
                "GIT_TERMINAL_PROMPT": "0", "GIT_PAGER": "cat", "GIT_EXTERNAL_DIFF": "", "GIT_ATTR_NOSYSTEM": "1",
                "GIT_NO_LAZY_FETCH": "1", "GIT_NO_REPLACE_OBJECTS": "1"})
    command = ["git", "--no-optional-locks", "--no-replace-objects", "-c", "core.useReplaceRefs=false",
               "-c", "core.fsmonitor=false", "-c", "diff.external=", "-c", "diff.renames=false", *args]
    try:
        result = subprocess.run(command, cwd=cwd, env=env, input=input_bytes, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, check=False)
    except OSError as exc:
        raise GateError("GIT_UNAVAILABLE", f"cannot execute Git: {exc}") from exc
    if result.returncode:
        detail = result.stderr.decode("utf-8", "replace").strip()
        raise GateError("GIT_INPUT_INVALID", detail or f"Git exited {result.returncode}")
    return result.stdout


def _root() -> Path:
    try:
        raw = _git(["rev-parse", "--show-toplevel"], cwd=Path.cwd())
        return Path(os.fsdecode(raw.rstrip(b"\n"))).resolve(strict=True)
    except (OSError, GateError) as exc:
        raise GateError("GIT_INPUT_INVALID", f"not inside a usable Git repository: {exc}") from exc


def _sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _canonical(value: object) -> bytes:
    try:
        return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True, allow_nan=False).encode("ascii")
    except (TypeError, ValueError) as exc:
        raise GateError("REPORT_SCHEMA_INVALID", str(exc)) from exc


def _json_load(path: Path) -> Any:
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        result: dict[str, Any] = {}
        for key, value in items:
            if key in result:
                raise GateError("DUPLICATE_JSON_KEY", f"duplicate JSON key {key!r}")
            result[key] = value
        return result
    try:
        return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=pairs,
                          parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
    except GateError:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError, ValueError) as exc:
        raise GateError("REPORT_JSON_INVALID", f"cannot read strict JSON at {path}: {exc}") from exc
def _reject_self_references(value: object, report_path: str) -> None:
    if isinstance(value, dict):
        if set(value) == {"path", "sha256"} and value.get("path") == report_path:
            raise GateError("EVIDENCE_SELF_REFERENCE", "report cannot be used as its own evidence", 1)
        for child in value.values():
            _reject_self_references(child, report_path)
    elif isinstance(value, list):
        for child in value:
            _reject_self_references(child, report_path)


def _policy_text(data: bytes) -> tuple[list[tuple[str, re.Pattern[str]]], bool]:
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise GateError("POLICY_INVALID", "policy is not UTF-8") from exc
    lines = text.splitlines()
    headings: list[int] = []
    in_fence = False
    fence_char = ""
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            char = stripped[0]
            if not in_fence:
                in_fence, fence_char = True, char
            elif char == fence_char:
                in_fence = False
            continue
        if not in_fence and stripped == "## Criticality Map":
            headings.append(index)
    if len(headings) > 1:
        raise GateError("POLICY_INVALID", "duplicate Criticality Map headings")
    if not headings:
        return [], False
    start = headings[0] + 1
    while start < len(lines) and not lines[start].strip():
        start += 1
    if start >= len(lines) or not re.fullmatch(r"\|\s*Class\s*\|\s*Glob\s*\|\s*Reason\s*\|", lines[start]):
        raise GateError("POLICY_INVALID", "Criticality Map requires exact Class | Glob | Reason header")
    row = start + 1
    if row < len(lines) and re.fullmatch(r"\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|\s*:?-{3,}:?\s*\|", lines[row]):
        row += 1
    rules: list[tuple[str, re.Pattern[str]]] = []
    while row < len(lines) and lines[row].lstrip().startswith("|"):
        line = lines[row]
        if "\\|" in line:
            raise GateError("POLICY_INVALID", "escaped pipes are not allowed")
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        if len(cells) != 3 or not all(cells):
            raise GateError("POLICY_INVALID", f"malformed Criticality Map row {row + 1}")
        klass, glob, reason = cells
        if klass not in {"trunk", "shared", "leaf"}:
            raise GateError("POLICY_INVALID", f"invalid class on row {row + 1}")
        _validate_glob(glob)
        rules.append((klass, _glob_regex(glob)))
        row += 1
    if not rules:
        raise GateError("POLICY_INVALID", "Criticality Map has no rows")
    return rules, True

def _has_base_grant(data: bytes | None, change_class: str, reversibility: str, review_level: str, reference: object) -> bool:
    if data is None or not isinstance(reference, str) or not reference.strip() or reference.strip().lower() == "none":
        return False
    try:
        lines = data.decode("utf-8").splitlines()
    except UnicodeDecodeError:
        return False
    sections: list[int] = []
    in_fence = False
    fence_char = ""
    for index, line in enumerate(lines):
        stripped = line.strip()
        if stripped.startswith("```") or stripped.startswith("~~~"):
            char = stripped[0]
            if not in_fence:
                in_fence, fence_char = True, char
            elif char == fence_char:
                in_fence = False
            continue
        if not in_fence and stripped == "## Approval":
            sections.append(index)
    if len(sections) != 1:
        return False
    index = sections[0] + 1
    while index < len(lines) and not lines[index].strip():
        index += 1
    header = "| Change class | Reversibility | Review level | Reviewer | Approver | Owner grant reference |"
    separator_cell = r"\s*:?-{3,}:?\s*"
    separator = re.compile(r"\|" + separator_cell + (r"\|" + separator_cell) * 5 + r"\|")
    if index + 1 >= len(lines) or lines[index].strip() != header or not separator.fullmatch(lines[index + 1]):
        return False
    for row in lines[index + 2:]:
        if not row.lstrip().startswith("|"):
            break
        if "\\|" in row:
            return False
        cells = [cell.strip() for cell in row.strip().strip("|").split("|")]
        if (len(cells) == 6 and cells[0:3] == [change_class, reversibility, review_level]
                and cells[3] and cells[4] and cells[5] == reference):
            return True
    return False


def _validate_glob(pattern: str) -> None:
    if pattern.startswith("/") or "\\" in pattern or "!" in pattern or "[" in pattern or "]" in pattern:
        raise GateError("POLICY_INVALID", f"invalid glob {pattern!r}")
    parts = pattern.split("/")
    if any(part in {".", ".."} or (not part and i != len(parts) - 1) or ("**" in part and part != "**")
           for i, part in enumerate(parts)):
        raise GateError("POLICY_INVALID", f"invalid path component in glob {pattern!r}")
    if pattern.endswith("/") and (len(parts) < 2 or not parts[-2]):
        raise GateError("POLICY_INVALID", f"invalid descendant glob {pattern!r}")


def _glob_regex(pattern: str) -> re.Pattern[str]:
    descendant = pattern.endswith("/")
    core = pattern[:-1] if descendant else pattern
    pieces: list[str] = ["^"]
    index = 0
    while index < len(core):
        char = core[index]
        if char == "*":
            if index + 1 < len(core) and core[index + 1] == "*":
                if index + 2 < len(core) and core[index + 2] == "/":
                    pieces.append("(?:[^/]+/)*")
                    index += 3
                else:
                    pieces.append(".*")
                    index += 2
            else:
                pieces.append("[^/]*")
                index += 1
        else:
            pieces.append(re.escape(char))
            index += 1
    pieces.append("(?:/.*)?$" if descendant else "$")
    return re.compile("".join(pieces))


def _class(path: str, rules: list[tuple[str, re.Pattern[str]]], has_map: bool, policy_path: str) -> str:
    if path in CONTROL_PATHS or path == policy_path or path in CODEOWNERS or re.fullmatch(r"skills/[^/]+/_INDEX\.md", path):
        return "trunk"
    if not has_map:
        return "unclassified"
    matches = [klass for klass, regex in rules if regex.fullmatch(path)]
    if not matches:
        return "shared"
    return min(matches, key={"trunk": 0, "shared": 1, "leaf": 2}.__getitem__)


def _policy_from_base(root: Path, base: str, policy_path: str) -> tuple[bytes | None, str | None]:
    _validate_repo_path(policy_path)
    tree = _git(["ls-tree", "-z", "--full-tree", base, "--", f":(literal){policy_path}"], cwd=root)
    if not tree:
        return None, None
    record = tree.rstrip(b"\0")
    metadata, path = record.split(b"\t", 1)
    mode, kind, oid = metadata.decode("ascii").split(" ")
    if kind != "blob" or mode in {"120000", "160000"}:
        raise GateError("GIT_INPUT_INVALID", "base policy is not a regular blob")
    data = _git(["cat-file", "blob", oid], cwd=root)
    return data, _sha(data)


def _validate_repo_path(path: object) -> str:
    if not isinstance(path, str) or not path or "\x00" in path or "\\" in path or path.startswith("/"):
        raise GateError("REPORT_SCHEMA_INVALID", "repository paths must be nonempty relative POSIX strings")
    if any(part in {"", ".", ".."} for part in path.split("/")):
        raise GateError("REPORT_SCHEMA_INVALID", f"unsafe repository path {path!r}")
    return path


def _blob_map(root: Path, treeish: str | None = None, index: bool = False) -> dict[bytes, Entry]:
    if index:
        raw = _git(["ls-files", "--stage", "-z"], cwd=root)
        result: dict[bytes, Entry] = {}
        for record in raw.split(b"\0"):
            if not record:
                continue
            metadata, path = record.split(b"\t", 1)
            mode, oid, stage = metadata.decode("ascii").split()
            if stage != "0":
                raise GateError("UNMERGED_INDEX", f"unresolved index entry: {os.fsdecode(path)}")
            if mode == "160000":
                raise GateError("UNSUPPORTED_SUBMODULE", f"submodule index entry: {os.fsdecode(path)}")
            data = _git(["cat-file", "blob", oid], cwd=root)
            result[path] = Entry(mode, "symlink" if mode == "120000" else "file", oid, data)
        return result
    raw = _git(["ls-tree", "-rz", "--full-tree", treeish or "HEAD"], cwd=root)
    result = {}
    for record in raw.split(b"\0"):
        if not record:
            continue
        metadata, path = record.split(b"\t", 1)
        mode, kind, oid = metadata.decode("ascii").split()
        if kind == "commit" or mode == "160000":
            raise GateError("UNSUPPORTED_SUBMODULE", f"submodule tree entry: {os.fsdecode(path)}")
        if kind != "blob" or mode == "120000":
            if kind != "blob":
                raise GateError("GIT_INPUT_INVALID", f"unsupported tree entry at {os.fsdecode(path)}")
        data = _git(["cat-file", "blob", oid], cwd=root)
        result[path] = Entry(mode, "symlink" if mode == "120000" else "file", oid, data)
    return result


def _filesystem_map(root: Path, exclusions: set[bytes]) -> dict[bytes, Entry]:
    result: dict[bytes, Entry] = {}
    root_bytes = os.fsencode(root)
    stack = [root_bytes]
    while stack:
        directory = stack.pop()
        try:
            names = sorted(os.listdir(directory))
        except OSError as exc:
            raise GateError("FILESYSTEM_UNREADABLE", f"cannot scan {os.fsdecode(directory)}: {exc}") from exc
        for name in names:
            name_b = os.fsencode(name)
            if name_b == b".git":
                continue
            absolute = os.path.join(directory, name_b)
            relative = os.path.relpath(absolute, root_bytes)
            if relative in exclusions:
                continue
            try:
                info = os.lstat(absolute)
            except OSError as exc:
                raise GateError("FILESYSTEM_UNREADABLE", f"cannot stat {os.fsdecode(relative)}: {exc}") from exc
            mode = info.st_mode
            if stat.S_ISDIR(mode):
                stack.append(absolute)
                continue
            if stat.S_ISREG(mode):
                try:
                    data = Path(os.fsdecode(absolute)).read_bytes()
                except OSError as exc:
                    raise GateError("FILESYSTEM_UNREADABLE", f"cannot read {os.fsdecode(relative)}: {exc}") from exc
                result[relative] = Entry("100755" if mode & 0o111 else "100644", "file", _sha(data), data)
            elif stat.S_ISLNK(mode):
                try:
                    data = os.readlink(absolute)
                    if isinstance(data, str):
                        data = os.fsencode(data)
                except OSError as exc:
                    raise GateError("FILESYSTEM_UNREADABLE", f"cannot read symlink {os.fsdecode(relative)}: {exc}") from exc
                result[relative] = Entry("120000", "symlink", _sha(data), data)
            else:
                raise GateError("UNSUPPORTED_FILE_TYPE", f"unsupported filesystem object: {os.fsdecode(relative)}")
    return result


def _scope_contains(raw_path: bytes, scope: dict[str, str]) -> bool:
    raw_scope = os.fsencode(scope["path"])
    if scope["kind"] == "file":
        return raw_path == raw_scope
    return raw_path == raw_scope or raw_path.startswith(raw_scope + b"/")


def _artifact_paths(report: dict[str, Any], root: Path, tracked: set[bytes], scope: str,
                    report_relative: str, source_scope: list[dict[str, str]]) -> set[bytes]:
    paths = report["artifact_inventory"]
    if not isinstance(paths, list) or not paths:
        raise GateError("REPORT_SCHEMA_INVALID", "artifact_inventory must be a nonempty exact path list")
    scope = _validate_repo_path(scope)
    if not scope.startswith("artifacts/") or scope != Path(report_relative).parent.as_posix():
        raise GateError("ARTIFACT_SCOPE_INVALID", "declared artifact_scope must equal the report's run directory", 1)
    result: set[bytes] = set()
    resolved: set[Path] = set()
    for item in paths:
        path = _validate_repo_path(item)
        if not path.startswith(scope + "/"):
            raise GateError("ARTIFACT_SCOPE_INVALID", f"artifact is outside declared run scope: {path}", 1)
        raw = os.fsencode(path)
        if any(_scope_contains(raw, entry) for entry in source_scope):
            raise GateError("ARTIFACT_SOURCE_OVERLAP", f"artifact exclusion overlaps frozen source/dependency scope: {path}", 1)
        if raw in result or raw in tracked:
            raise GateError("EVIDENCE_PATH_UNSAFE", f"duplicate or tracked evidence path: {path}", 1)
        current = root
        for part in path.split("/"):
            current = current / part
            if current.is_symlink():
                raise GateError("EVIDENCE_PATH_UNSAFE", f"symlink component in evidence path: {path}", 1)
        try:
            info = current.lstat()
        except OSError as exc:
            raise GateError("EVIDENCE_MISSING", f"missing evidence file {path}: {exc}", 1) from exc
        if not stat.S_ISREG(info.st_mode):
            raise GateError("EVIDENCE_PATH_UNSAFE", f"evidence is not a regular file: {path}", 1)
        if info.st_mode & 0o111:
            raise GateError("ARTIFACT_EXECUTABLE", f"executable files cannot be excluded as evidence: {path}", 1)
        canonical = current.resolve(strict=True)
        if canonical in resolved or not canonical.is_relative_to(root):
            raise GateError("EVIDENCE_PATH_UNSAFE", f"evidence path aliases or escapes: {path}", 1)
        resolved.add(canonical)
        result.add(raw)
    report_raw = os.fsencode(report_relative)
    if report_raw not in result:
        raise GateError("REPORT_NOT_IN_INVENTORY", "report path must be in the frozen artifact inventory", 1)
    return result


def _manifest(root: Path, base: str, head: str, policy_digest: str | None, exclusions: set[bytes],
              inventory: list[str], scope_inventory_digest: str | None = None) -> tuple[str, dict[bytes, Entry], dict[bytes, Entry], dict[bytes, Entry], dict[bytes, Entry]]:
    base_map = _blob_map(root, base)
    head_map = _blob_map(root, head)
    index_map = _blob_map(root, index=True)
    fs_map = _filesystem_map(root, exclusions)
    records: list[dict[str, object]] = [{"type": "identity", "base": base, "head": head, "policy_sha256": policy_digest,
                                       "artifact_inventory": sorted(inventory, key=os.fsencode),
                                       "scope_inventory_sha256": scope_inventory_digest}]
    for source, entries in (("base", base_map), ("head", head_map), ("index", index_map)):
        for path, entry in sorted(entries.items()):
            records.append({"type": source, "path": base64.b64encode(path).decode(), "mode": entry.mode,
                            "kind": entry.kind, "oid": entry.oid, "stage": 0 if source == "index" else None})
    for path, entry in sorted(fs_map.items()):
        records.append({"type": "filesystem", "path": base64.b64encode(path).decode(), "kind": entry.kind,
                        "mode": entry.mode, "sha256": entry.oid})
    encoded = [_canonical(record) for record in records]
    payload = b"".join(len(record).to_bytes(8, "big") + record for record in encoded)
    return _sha(payload), base_map, head_map, index_map, fs_map




def _same_entry(before: Entry | None, after: Entry | None) -> bool:
    if before is None or after is None:
        return before is after
    return before.mode == after.mode and before.kind == after.kind and before.data == after.data

def _units(base: dict[bytes, Entry], target: dict[bytes, Entry], comparison: str) -> list[dict[str, Any]]:
    units: list[dict[str, Any]] = []
    for path in sorted(set(base) | set(target)):
        before, after = base.get(path), target.get(path)
        if _same_entry(before, after):
            continue
        before_data = before.data if before else b""
        after_data = after.data if after else b""
        before_mode = before.mode if before else None
        after_mode = after.mode if after else None
        metadata_changed = before_mode != after_mode or (before is not None and after is not None and before.kind != after.kind)
        common = {"comparison": comparison, "path": os.fsdecode(path), "before_sha256": _sha(before_data) if before else None,
                  "after_sha256": _sha(after_data) if after else None, "before_mode": before_mode, "after_mode": after_mode}
        if before is None or after is None or before.kind != "file" or after.kind != "file" or not before_data or not after_data or b"\0" in before_data or b"\0" in after_data:
            item = {**common, "kind": "whole-file" if before_data != after_data else "metadata", "start": 0, "end": 0}
            item["id"] = _sha(_canonical(item))
            units.append(item)
            continue
        if metadata_changed:
            item = {**common, "kind": "metadata", "start": 0, "end": 0}
            item["id"] = _sha(_canonical(item))
            units.append(item)
            if before_data == after_data:
                continue
        diff = list(difflib.diff_bytes(difflib.unified_diff, before_data.splitlines(keepends=True), after_data.splitlines(keepends=True),
                                       fromfile=b"before", tofile=b"after", lineterm=b"\n", n=3))
        if not any(line.startswith(b"@@") for line in diff):
            item = {**common, "kind": "whole-file", "start": 0, "end": 0}
            item["id"] = _sha(_canonical(item))
            units.append(item)
            continue
        current: list[bytes] = []
        start = end = 0
        for line in diff:
            if line.startswith(b"@@"):
                if current:
                    item = {**common, "kind": "hunk", "start": start, "end": end,
                            "hunk_sha256": _sha(b"".join(current)), "hunk_b64": base64.b64encode(b"".join(current)).decode("ascii")}
                    item["id"] = _sha(_canonical(item))
                    units.append(item)
                current = [line]
                match = re.search(rb"\+(\d+)(?:,(\d+))?", line)
                start = int(match.group(1)) if match else 0
                end = start + (int(match.group(2)) if match and match.group(2) else 1) - 1
            elif current:
                current.append(line)
        if current:
            item = {**common, "kind": "hunk", "start": start, "end": end,
                    "hunk_sha256": _sha(b"".join(current)), "hunk_b64": base64.b64encode(b"".join(current)).decode("ascii")}
            item["id"] = _sha(_canonical(item))
            units.append(item)
    return units


def _required(condition: bool, code: str, message: str) -> None:
    if not condition:
        raise GateError(code, message, 1)


def _keys(obj: object, expected: set[str], label: str) -> dict[str, Any]:
    if not isinstance(obj, dict) or set(obj) != expected:
        raise GateError("REPORT_SCHEMA_INVALID", f"{label} must contain exactly {sorted(expected)}")
    return obj

def _dispatch_scope(path: Path, root: Path) -> tuple[dict[str, Any], list[dict[str, str]], str]:
    try:
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_mode & 0o111:
            raise GateError("DISPATCH_RECEIPT_INVALID", "dispatch receipt must be a non-executable regular file")
        resolved = path.resolve(strict=True)
        if resolved.is_relative_to(root):
            raise GateError("DISPATCH_RECEIPT_INVALID", "dispatch receipt must be external to the repository")
        receipt = _json_load(resolved)
    except GateError:
        raise
    except OSError as exc:
        raise GateError("DISPATCH_RECEIPT_INVALID", f"cannot read external dispatch receipt: {exc}") from exc
    body = _keys(receipt, {"schema_version", "artifact_scope", "artifact_inventory", "source_scope",
                           "scope_inventory_sha256"}, "external dispatch receipt")
    if type(body["schema_version"]) is not int or body["schema_version"] != 1:
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch receipt schema_version must be integer 1")
    if not isinstance(body["artifact_scope"], str):
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch receipt artifact_scope must be a string")
    _validate_repo_path(body["artifact_scope"])
    inventory = body["artifact_inventory"]
    if not isinstance(inventory, list):
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch receipt artifact_inventory must be an array")
    inventory_paths = [_validate_repo_path(item) for item in inventory]
    if len(set(inventory_paths)) != len(inventory_paths):
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch receipt artifact_inventory contains duplicates")
    source_scope = body["source_scope"]
    if not isinstance(source_scope, list) or not source_scope:
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch receipt source_scope must be a nonempty array")
    normalized_scope: list[dict[str, str]] = []
    seen_scope: set[str] = set()
    for entry in source_scope:
        item = _keys(entry, {"path", "kind"}, "dispatch receipt source_scope entry")
        if not isinstance(item["kind"], str) or item["kind"] not in {"file", "directory"}:
            raise GateError("REPORT_SCHEMA_INVALID", "source_scope kind must be file or directory")
        scoped_path = _validate_repo_path(item["path"])
        key = scoped_path
        if key in seen_scope:
            raise GateError("REPORT_SCHEMA_INVALID", "dispatch receipt source_scope contains duplicate paths")
        seen_scope.add(key)
        normalized_scope.append({"path": scoped_path, "kind": item["kind"]})
    digest = body["scope_inventory_sha256"]
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch receipt scope_inventory_sha256 must be lowercase SHA-256")
    payload = {key: body[key] for key in ("schema_version", "artifact_scope", "artifact_inventory", "source_scope")}
    computed = _sha(_canonical(payload))
    _required(digest == computed, "DISPATCH_RECEIPT_DIGEST_MISMATCH",
              "external dispatch receipt scope/inventory digest does not match its contents")
    return body, normalized_scope, digest


def _evidence(root: Path, value: object, inventory: set[bytes], label: str,
              roles: dict[bytes, set[str]], digests: dict[bytes, str]) -> tuple[Path, str]:
    item = _keys(value, {"path", "sha256"}, label)
    path = _validate_repo_path(item["path"])
    digest = item["sha256"]
    if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
        raise GateError("REPORT_SCHEMA_INVALID", f"{label}.sha256 must be lowercase SHA-256")
    raw = os.fsencode(path)
    _required(raw in inventory, "EVIDENCE_NOT_IN_INVENTORY", f"{label} path is not in artifact_inventory: {path}")
    target = root.joinpath(*path.split("/"))
    try:
        info = target.lstat()
        if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o111:
            raise GateError("EVIDENCE_PATH_UNSAFE", f"evidence is not a non-executable regular file: {path}", 1)
        data = target.read_bytes()
    except GateError:
        raise
    except OSError as exc:
        raise GateError("EVIDENCE_MISSING", f"cannot read {label} at {path}: {exc}", 1) from exc
    _required(_sha(data) == digest, "EVIDENCE_DIGEST_MISMATCH", f"digest mismatch for {label}: {path}")
    if raw in digests and digests[raw] != digest:
        raise GateError("EVIDENCE_DIGEST_MISMATCH", f"conflicting digests for {label}: {path}", 1)
    digests[raw] = digest
    roles.setdefault(raw, set()).add(label)
    return target, digest


def _receipt(root: Path, value: object, inventory: set[bytes], label: str,
             roles: dict[bytes, set[str]], digests: dict[bytes, str]) -> dict[str, Any]:
    path, _ = _evidence(root, value, inventory, label, roles, digests)
    receipt = _json_load(path)
    if (not isinstance(receipt, dict) or type(receipt.get("schema_version")) is not int
            or receipt["schema_version"] != 1):
        raise GateError("REPORT_SCHEMA_INVALID", f"{label} must contain JSON schema_version 1")
    return receipt


def _check_report(root: Path, report_path: Path, policy_path: str, base_arg: str, dispatch_receipt_path: Path) -> None:
    absolute_report = report_path.absolute()
    try:
        relative_report = absolute_report.relative_to(root)
    except ValueError as exc:
        raise GateError("EVIDENCE_PATH_UNSAFE", "report must be inside the repository", 1) from exc
    current = root
    for part in relative_report.parts:
        if part in {"", ".", ".."}:
            raise GateError("EVIDENCE_PATH_UNSAFE", "report path contains traversal", 1)
        current = current / part
        if current.is_symlink():
            raise GateError("EVIDENCE_PATH_UNSAFE", "report path contains a symlink", 1)
    report = _json_load(absolute_report)
    _reject_self_references(report, relative_report.as_posix())
    report_keys = {"schema_version", "dispatch", "source_identity", "artifact_inventory", "baseline_receipt",
                   "verdict", "change_class", "reversibility", "review_level", "actors", "criteria", "blind_phase",
                   "orchestrator_check_receipt", "reviewer_reproduced", "reproduction_gap", "gate", "findings",
                   "human_attention", "reviewer_nominations", "policy_evidence"}
    if (not isinstance(report, dict) or set(report) != report_keys
            or type(report.get("schema_version")) is not int or report["schema_version"] != 1):
        raise GateError("REPORT_SCHEMA_INVALID", "report has unknown/missing fields or schema_version is not integer 1")
    if not isinstance(report["verdict"], str) or report["verdict"] not in {"READY", "NOT READY", "BLOCKED"}:
        raise GateError("REPORT_SCHEMA_INVALID", "verdict must be READY, NOT READY, or BLOCKED")
    dispatch = _keys(report.get("dispatch"), {"base_oid", "head_oid", "policy_path", "policy_sha256", "criterion_inventory", "artifact_inventory", "artifact_scope", "scope_inventory_sha256"}, "dispatch")
    identity = _keys(report.get("source_identity"), {"base_oid", "head_oid", "manifest_sha256", "dirty_identity", "policy_sha256"}, "source_identity")
    scope_receipt, source_scope, scope_digest = _dispatch_scope(dispatch_receipt_path, root)
    if not isinstance(dispatch["scope_inventory_sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", dispatch["scope_inventory_sha256"]):
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch.scope_inventory_sha256 must be lowercase SHA-256")
    if not isinstance(dispatch["artifact_scope"], str) or not isinstance(dispatch["artifact_inventory"], list):
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch artifact scope and inventory have invalid types")
    if any(not isinstance(item, str) for item in dispatch["artifact_inventory"]):
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch artifact_inventory entries must be strings")
    _required(dispatch["scope_inventory_sha256"] == scope_digest, "DISPATCH_RECEIPT_MISMATCH",
              "report scope/inventory digest differs from the external receipt")
    _required(dispatch["artifact_scope"] == scope_receipt["artifact_scope"], "ARTIFACT_SCOPE_INVALID",
              "report artifact_scope differs from the independent external dispatch receipt")
    _required(dispatch["artifact_inventory"] == scope_receipt["artifact_inventory"], "ARTIFACT_INVENTORY_MISMATCH",
              "report artifact_inventory differs from the independent external dispatch receipt")
    for name in ("base_oid", "head_oid"):
        for source, value in (("dispatch", dispatch[name]), ("source_identity", identity[name])):
            if not isinstance(value, str) or not HEX.fullmatch(value):
                raise GateError("REPORT_SCHEMA_INVALID", f"{source}.{name} must be a full commit OID")
    for source, value in (("dispatch.policy_sha256", dispatch["policy_sha256"]),
                          ("source_identity.policy_sha256", identity["policy_sha256"])):
        if value is not None and (not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{64}", value)):
            raise GateError("REPORT_SCHEMA_INVALID", f"{source} must be lowercase SHA-256 or null")
    for name in ("manifest_sha256", "dirty_identity"):
        value = identity[name]
        if not isinstance(value, str) or not re.fullmatch(r"[0-9a-f]{64}", value):
            raise GateError("REPORT_SCHEMA_INVALID", f"source_identity.{name} must be lowercase SHA-256")
    if not isinstance(base_arg, str) or not HEX.fullmatch(base_arg):
        raise GateError("GIT_INPUT_INVALID", "--base requires a full commit OID")
    actual_head = _git(["rev-parse", "--verify", "HEAD^{commit}"], cwd=root).decode("ascii").strip()
    base = _git(["rev-parse", "--verify", f"{base_arg}^{{commit}}"], cwd=root).decode("ascii").strip()
    _required(base_arg == base, "BASE_NOT_FULL_OID", "--base must be the exact full commit OID")
    _required(base == dispatch["base_oid"] == identity["base_oid"], "BASE_IDENTITY_MISMATCH", "selected base differs from frozen dispatch/source identity")
    _required(actual_head == dispatch["head_oid"] == identity["head_oid"], "HEAD_IDENTITY_MISMATCH", "actual HEAD differs from frozen dispatch/source identity")
    merge_base = _git(["merge-base", base, actual_head], cwd=root).decode("ascii").strip()
    _required(merge_base == base, "BASE_NOT_ANCESTOR", "selected base is not an ancestor of actual HEAD")
    if not isinstance(dispatch["policy_path"], str):
        raise GateError("REPORT_SCHEMA_INVALID", "dispatch.policy_path must be a string")
    _required(dispatch["policy_path"] == policy_path, "POLICY_PATH_MISMATCH", "CLI policy path differs from frozen dispatch")
    policy_path = _validate_repo_path(policy_path)
    _required(not report_path.is_symlink(), "EVIDENCE_PATH_UNSAFE", "report cannot be a symlink")
    report_path = report_path.resolve(strict=True)
    _required(report_path.is_relative_to(root) and report_path.is_file(),
              "EVIDENCE_PATH_UNSAFE", "report must be a regular file inside the repository")
    policy_data, policy_digest = _policy_from_base(root, base, policy_path)
    if policy_data is None:
        _required(dispatch["policy_sha256"] is None and identity["policy_sha256"] is None,
                  "POLICY_IDENTITY_MISMATCH", "absent base policy must have a null digest")
    else:
        _required(dispatch["policy_sha256"] == identity["policy_sha256"] == policy_digest,
                  "POLICY_IDENTITY_MISMATCH", "base policy digest differs from frozen identity")
    inventory_paths = dispatch["artifact_inventory"]
    _required(report.get("artifact_inventory") == inventory_paths, "ARTIFACT_INVENTORY_MISMATCH", "report and dispatch artifact inventories differ")
    tracked = set(_blob_map(root, base)) | set(_blob_map(root, actual_head)) | set(_blob_map(root, index=True))
    report_relative_text = report_path.relative_to(root).as_posix()
    exclusions = _artifact_paths({"artifact_inventory": inventory_paths}, root, tracked,
                                  dispatch["artifact_scope"], report_relative_text, source_scope)
    report_relative = os.fsencode(report_relative_text)
    roles: dict[bytes, set[str]] = {}
    digests: dict[bytes, str] = {}
    manifest_digest, base_map, head_map, index_map, fs_map = _manifest(
        root, base, actual_head, policy_digest, exclusions, inventory_paths, scope_digest)
    _required(identity["manifest_sha256"] == manifest_digest and identity["dirty_identity"] == manifest_digest,
              "SOURCE_IDENTITY_MISMATCH", "computed base/index/worktree identity differs from frozen report")
    rules, has_map = _policy_text(policy_data or b"")
    all_units = _units(base_map, head_map, "base-head") + _units(base_map, index_map, "base-index") + _units(base_map, fs_map, "base-worktree")
    inventory_obj = _keys(dispatch["criterion_inventory"], {"path", "sha256"}, "dispatch.criterion_inventory")
    inventory_file, inventory_digest = _evidence(root, inventory_obj, exclusions, "criterion_inventory", roles, digests)
    criteria_doc = _json_load(inventory_file)
    if (not isinstance(criteria_doc, dict) or set(criteria_doc) != {"schema_version", "criteria"}
            or type(criteria_doc.get("schema_version")) is not int or criteria_doc["schema_version"] != 1
            or not isinstance(criteria_doc["criteria"], list)):
        raise GateError("REPORT_SCHEMA_INVALID", "criterion inventory must be integer schema_version 1 with criteria array")
    criterion_ids: set[str] = set()
    for criterion in criteria_doc["criteria"]:
        item = _keys(criterion, {"id", "required", "applicable"}, "criterion inventory entry")
        if not isinstance(item["id"], str) or not item["id"] or type(item["required"]) is not bool or type(item["applicable"]) is not bool or item["id"] in criterion_ids:
            raise GateError("REPORT_SCHEMA_INVALID", "invalid or duplicate criterion inventory entry")
        criterion_ids.add(item["id"])
    criteria = report.get("criteria")
    if not isinstance(criteria, list):
        raise GateError("REPORT_SCHEMA_INVALID", "criteria must be an array")
    by_id: dict[str, dict[str, Any]] = {}
    for item in criteria:
        entry = _keys(item, {"id", "result", "scope_reason", "proof"}, "criterion result")
        if (not isinstance(entry["id"], str) or entry["id"] in by_id
                or not isinstance(entry["result"], str) or entry["result"] not in RESULTS
                or (entry["scope_reason"] is not None and not isinstance(entry["scope_reason"], str))):
            raise GateError("REPORT_SCHEMA_INVALID", "criterion results have duplicate IDs or invalid primitive/enum fields")
        by_id[entry["id"]] = entry
    _required(set(by_id) == criterion_ids, "CRITERION_INVENTORY_MISMATCH", "report criteria do not exactly match frozen inventory")
    for criterion in criteria_doc["criteria"]:
        result = by_id[criterion["id"]]
        if not criterion["applicable"]:
            _required(result["result"] == "NOT APPLICABLE" and isinstance(result["scope_reason"], str) and bool(result["scope_reason"].strip()),
                      "UNJUSTIFIED_NOT_APPLICABLE", f"criterion {criterion['id']} is not applicable without a scope reason")
        elif criterion["required"] and report["verdict"] == "READY":
            _required(result["result"] not in {"FAIL", "NOT RUN", "BLOCKED", "NOT APPLICABLE"}, "REQUIRED_CRITERION_INCOMPLETE",
                      f"required criterion {criterion['id']} is {result['result']}")
        elif result["result"] == "NOT APPLICABLE":
            raise GateError("UNJUSTIFIED_NOT_APPLICABLE", f"applicable criterion {criterion['id']} cannot be NOT APPLICABLE", 1)
        if result["proof"] is not None:
            _evidence(root, result["proof"], exclusions, f"criterion {criterion['id']} proof", roles, digests)
        elif criterion["required"] and criterion["applicable"] and result["result"] == "PASS":
            raise GateError("CRITERION_PROOF_MISSING", f"required PASS criterion {criterion['id']} lacks proof", 1)
    baseline = _receipt(root, report.get("baseline_receipt"), exclusions, "baseline_receipt", roles, digests)
    _keys(baseline, {"schema_version", "base_oid", "criterion_inventory_sha256"}, "baseline receipt")
    if (not isinstance(baseline["base_oid"], str) or not HEX.fullmatch(baseline["base_oid"])
            or not isinstance(baseline["criterion_inventory_sha256"], str)
            or not re.fullmatch(r"[0-9a-f]{64}", baseline["criterion_inventory_sha256"])):
        raise GateError("REPORT_SCHEMA_INVALID", "baseline receipt identity fields have invalid types")
    _required(baseline["base_oid"] == base and baseline["criterion_inventory_sha256"] == inventory_digest,
              "BASELINE_RECEIPT_MISMATCH", "baseline receipt does not bind the selected base and criterion inventory")
    phase = _keys(report.get("blind_phase"), {"artifact", "frozen_receipt", "frozen_before_reconcile"}, "blind_phase")
    if type(phase["frozen_before_reconcile"]) is not bool:
        raise GateError("REPORT_SCHEMA_INVALID", "frozen_before_reconcile must be boolean")
    _required(phase["frozen_before_reconcile"] is True, "BLIND_PHASE_NOT_FROZEN", "blind phase must be frozen before reconciliation")
    _, phase_digest = _evidence(root, phase["artifact"], exclusions, "blind_phase.artifact", roles, digests)
    phase_receipt = _receipt(root, phase["frozen_receipt"], exclusions, "blind_phase.frozen_receipt", roles, digests)
    _keys(phase_receipt, {"schema_version", "source_revision", "dirty_identity", "artifact_sha256"}, "blind phase receipt")
    if (not isinstance(phase_receipt["source_revision"], str) or not HEX.fullmatch(phase_receipt["source_revision"])
            or not isinstance(phase_receipt["dirty_identity"], str) or not re.fullmatch(r"[0-9a-f]{64}", phase_receipt["dirty_identity"])
            or not isinstance(phase_receipt["artifact_sha256"], str) or not re.fullmatch(r"[0-9a-f]{64}", phase_receipt["artifact_sha256"])):
        raise GateError("REPORT_SCHEMA_INVALID", "blind phase receipt identity fields have invalid types")
    _required(phase_receipt["source_revision"] == actual_head and phase_receipt["dirty_identity"] == manifest_digest
              and phase_receipt["artifact_sha256"] == phase_digest, "BLIND_PHASE_IDENTITY_MISMATCH", "blind receipt does not bind the frozen phase artifact and source")
    check_receipt = _receipt(root, report.get("orchestrator_check_receipt"), exclusions, "orchestrator_check_receipt", roles, digests)
    _keys(check_receipt, {"schema_version", "source_revision", "dirty_identity", "checks"}, "orchestrator check receipt")
    if (not isinstance(check_receipt["source_revision"], str) or not HEX.fullmatch(check_receipt["source_revision"])
            or not isinstance(check_receipt["dirty_identity"], str) or not re.fullmatch(r"[0-9a-f]{64}", check_receipt["dirty_identity"])):
        raise GateError("REPORT_SCHEMA_INVALID", "check receipt identity fields have invalid types")
    _required(check_receipt["source_revision"] == actual_head and check_receipt["dirty_identity"] == manifest_digest,
              "CHECK_RECEIPT_IDENTITY_MISMATCH", "current check receipt does not bind the observed source")
    if not isinstance(check_receipt["checks"], list):
        raise GateError("REPORT_SCHEMA_INVALID", "check receipt checks must be an array")
    for check in check_receipt["checks"]:
        item = _keys(check, {"command", "cwd", "exit_code", "raw_output", "status", "required", "scope_reason"}, "check receipt entry")
        if (not isinstance(item["command"], str) or not item["command"].strip()
                or not isinstance(item["cwd"], str) or not item["cwd"].strip()
                or type(item["required"]) is not bool or not isinstance(item["status"], str) or item["status"] not in RESULTS
                or (item["exit_code"] is not None and type(item["exit_code"]) is not int)
                or (item["scope_reason"] is not None and not isinstance(item["scope_reason"], str))):
            raise GateError("REPORT_SCHEMA_INVALID", "check receipt entry has invalid fields")
        if item["status"] == "PASS":
            _required(item["exit_code"] == 0, "CHECK_RECEIPT_MISMATCH", "PASS check must have exit code 0")
        elif item["status"] == "FAIL":
            _required(item["exit_code"] is not None and item["exit_code"] != 0, "CHECK_RECEIPT_MISMATCH", "FAIL check must have nonzero exit code")
        else:
            _required(item["exit_code"] is None and isinstance(item["scope_reason"], str) and bool(item["scope_reason"].strip()),
                      "CHECK_RECEIPT_MISMATCH", "unexecuted/inapplicable check requires null exit and reason")
        _evidence(root, item["raw_output"], exclusions, "check raw output", roles, digests)
    actors = _keys(report.get("actors"), {"implementer", "reviewer"}, "actors")
    if not isinstance(actors["implementer"], str) or not isinstance(actors["reviewer"], str):
        raise GateError("REPORT_SCHEMA_INVALID", "actor declarations must be strings")
    _required(actors["implementer"] != actors["reviewer"],
              "SAME_ACTOR", "declared implementer and reviewer must differ; inequality does not authenticate identity")
    gate = _keys(report.get("gate"), {"flag", "control", "rollback", "reversibility", "authorization"}, "gate")
    gate_flag, gate_control, rollback, gate_reversibility = (gate[name] for name in ("flag", "control", "rollback", "reversibility"))
    authorization = gate["authorization"]
    valid_gate_values = (all(isinstance(value, str) for value in (gate_flag, gate_control, rollback, gate_reversibility))
                         and gate_reversibility in {"gated", "revertible", "one-way"}
                         and rollback in {"flag off", "revert", "one-way"}
                         and (authorization is None or isinstance(authorization, str)))
    if not valid_gate_values:
        raise GateError("GATE_CONTRACT_INVALID", "gate fields must use exact C2 primitive types and enums")
    none_gate = gate_flag.strip().lower().startswith("none:")
    none_reason = gate_flag.split(":", 1)[1].strip() if none_gate else ""
    if (not gate_flag.strip() or gate_flag.strip().lower() == "none" or _has_placeholder(gate_flag)
            or (none_gate and (not none_reason or _has_placeholder(none_reason)))
            or not gate_control.strip() or _has_placeholder(gate_control)
            or (authorization is not None and (not authorization.strip() or _has_placeholder(authorization)))):
        raise GateError("GATE_CONTRACT_INVALID", "gate flag, control, and authorization must be concrete; none requires a reason")
    expected_rollback = {"gated": "flag off", "revertible": "revert", "one-way": "one-way"}[gate_reversibility]
    if rollback != expected_rollback or (rollback == "flag off" and none_gate):
        raise GateError("GATE_CONTRACT_INVALID", "rollback and flag pairing do not satisfy C2")
    if gate_reversibility == "one-way" and authorization is None:
        raise GateError("GATE_CONTRACT_INVALID", "one-way changes require a concrete authorization reference")
    report_reversibility = report.get("reversibility")
    if not isinstance(report_reversibility, str) or report_reversibility not in {"gated", "revertible", "one-way"}:
        raise GateError("REPORT_SCHEMA_INVALID", "report reversibility must be a C2 enum")
    _required(report_reversibility == gate_reversibility, "GATE_REVERSIBILITY_MISMATCH", "report and parsed gate reversibility differ")
    review_level = report.get("review_level")
    change_class = report.get("change_class")
    if not isinstance(change_class, str) or change_class not in {"trunk", "shared", "leaf", "unclassified"}:
        raise GateError("REPORT_SCHEMA_INVALID", "invalid change_class")
    if not isinstance(review_level, str) or review_level not in {"report-only", "line-review", "hunk-review", "not-assessed"}:
        raise GateError("REPORT_SCHEMA_INVALID", "invalid review_level")
    if review_level == "report-only":
        raise GateError("REPORT_ONLY_DISABLED", "report-only is ALWAYS DISABLED by this implementation", 1)
    policy_evidence = _keys(report.get("policy_evidence"), {"grant_reference", "calibration_evidence"}, "policy_evidence")
    if (policy_evidence["grant_reference"] is not None and not isinstance(policy_evidence["grant_reference"], str)
            or not isinstance(policy_evidence["calibration_evidence"], list)):
        raise GateError("REPORT_SCHEMA_INVALID", "grant_reference must be string/null and calibration_evidence an array")
    for item in policy_evidence["calibration_evidence"]:
        _evidence(root, item, exclusions, "calibration evidence", roles, digests)
    if set(roles) != exclusions - {report_relative}:
        unused = sorted(os.fsdecode(path) for path in exclusions - {report_relative} - set(roles))
        raise GateError("ARTIFACT_INVENTORY_UNUSED", f"inventory exclusions lack referenced digest-verified evidence roles: {unused}", 1)
    if review_level == "hunk-review":
        _required(change_class != "trunk" and gate["reversibility"] != "one-way"
                  and _has_base_grant(policy_data, change_class, gate["reversibility"], review_level, policy_evidence["grant_reference"]),
                  "BASE_POLICY_GRANT_MISSING", "hunk-review needs a matching explicit owner grant in BASE policy")
    if gate["reversibility"] == "one-way" or change_class in {"trunk", "unclassified"}:
        _required(review_level == "line-review", "LINE_REVIEW_REQUIRED", "trunk, unclassified, and one-way changes require line-review")
    reproduced = report.get("reviewer_reproduced")
    gap = report.get("reproduction_gap")
    if gap is not None and not isinstance(gap, str):
        raise GateError("REPORT_SCHEMA_INVALID", "reproduction_gap must be string or null")
    claim_mismatch = False
    if reproduced is None:
        _required(isinstance(gap, str) and bool(gap.strip()), "REPRODUCTION_EVIDENCE_MISSING", "missing reproduction requires an explicit gap")
    else:
        reproduced = _keys(reproduced, {"command", "claimed", "observed"}, "reviewer_reproduced")
        if (not isinstance(reproduced["command"], str) or not reproduced["command"].strip()
                or not isinstance(reproduced["claimed"], str) or reproduced["claimed"] not in RESULTS
                or not isinstance(reproduced["observed"], str) or reproduced["observed"] not in RESULTS):
            raise GateError("REPORT_SCHEMA_INVALID", "reproduction command and statuses must use exact types/enums")
        unexecuted = reproduced["claimed"] not in {"PASS", "FAIL"} or reproduced["observed"] not in {"PASS", "FAIL"}
        _required(isinstance(gap, str) and bool(gap.strip()) if unexecuted else gap is None,
                  "REPRODUCTION_EVIDENCE_MISSING", "unexecuted reproduction requires a concrete reproduction_gap")
        claim_mismatch = reproduced["claimed"] != reproduced["observed"]
    findings = report.get("findings")
    if not isinstance(findings, list):
        raise GateError("REPORT_SCHEMA_INVALID", "findings must be an array")
    finding_paths: set[str] = set()
    blocking_claim_mismatch = False
    for finding in findings:
        item = _keys(finding, {"severity", "path", "open", "evidence", "why", "fix", "prevent_by"}, "finding")
        if (not isinstance(item["severity"], str) or item["severity"] not in SEVERITIES
                or not isinstance(item["path"], str) or type(item["open"]) is not bool
                or not isinstance(item["prevent_by"], str) or item["prevent_by"] not in PREVENT_BY
                or not all(isinstance(item[key], str) and item[key].strip() for key in ("evidence", "why", "fix"))):
            raise GateError("REPORT_SCHEMA_INVALID", "finding primitive fields or prescribed enums are invalid")
        path = _validate_repo_path(item["path"])
        finding_paths.add(path)
        text = f"{item['evidence']} {item['why']}".lower()
        if item["open"] and item["severity"] == "Blocker" and "claim" in text and "observ" in text:
            blocking_claim_mismatch = True
        if item["open"] and item["severity"] in {"Blocker", "Major"} and report["verdict"] == "READY":
            raise GateError("OPEN_MAJOR_FINDING", f"READY contains open {item['severity']} finding at {path}", 1)
    _required(not claim_mismatch or blocking_claim_mismatch, "CLAIM_RESULT_MISMATCH", "reproduction mismatch must be represented by an open Blocker")
    attention = report.get("human_attention")
    if not isinstance(attention, list):
        raise GateError("REPORT_SCHEMA_INVALID", "human_attention must be an array")
    attention_units: set[str] = set()
    attention_paths: set[str] = set()
    attention_rows: list[tuple[str, list[str]]] = []
    for row in attention:
        item = _keys(row, {"path", "unit_ids"}, "human_attention entry")
        path = _validate_repo_path(item["path"])
        if not isinstance(item["unit_ids"], list) or any(not isinstance(unit, str) for unit in item["unit_ids"]):
            raise GateError("REPORT_SCHEMA_INVALID", "human_attention unit_ids must be strings")
        attention_paths.add(path)
        attention_units.update(item["unit_ids"])
        attention_rows.append((path, item["unit_ids"]))
    nominations = report.get("reviewer_nominations")
    if not isinstance(nominations, list):
        raise GateError("REPORT_SCHEMA_INVALID", "reviewer_nominations must be an array")
    nomination_paths: set[str] = set()
    nomination_units: set[str] = set()
    nomination_rows: list[tuple[str, list[str]]] = []
    for row in nominations:
        item = _keys(row, {"path", "unit_ids"}, "reviewer nomination")
        path = _validate_repo_path(item["path"])
        nomination_paths.add(path)
        if not isinstance(item["unit_ids"], list) or any(not isinstance(unit, str) for unit in item["unit_ids"]):
            raise GateError("REPORT_SCHEMA_INVALID", "nomination unit_ids must be strings")
        nomination_units.update(item["unit_ids"])
        nomination_rows.append((path, item["unit_ids"]))
    unit_path = {unit["id"]: unit["path"] for unit in all_units}
    all_unit_ids = set(unit_path)
    _required(attention_units <= all_unit_ids and nomination_units <= all_unit_ids,
              "ATTENTION_UNIT_UNKNOWN", "human_attention or nomination includes stale or extraneous diff unit")
    for path, unit_ids in attention_rows + nomination_rows:
        _required(all(unit_path[unit_id] == path for unit_id in unit_ids),
                  "ATTENTION_UNIT_PATH_MISMATCH", f"diff unit is listed under a path other than its exact unit path: {path}")
    _required(nomination_units <= attention_units and nomination_paths <= attention_paths,
              "NOMINATION_ATTENTION_MISSING", "human_attention omits a reviewer nomination")
    required_attention = {unit["id"] for unit in all_units if _class(unit["path"], rules, has_map, policy_path) == "trunk"}
    required_attention |= {unit["id"] for unit in all_units if unit["path"] in finding_paths}
    required_attention |= nomination_units
    _required(required_attention <= attention_units, "ATTENTION_COVERAGE_INCOMPLETE", "human_attention omits trunk, finding-bearing, or nominated diff units")
    _required(finding_paths <= attention_paths, "FINDING_ATTENTION_MISSING", "human_attention omits finding-bearing path")
    changed_paths = [path for path in set(base_map) | set(head_map) | set(index_map) | set(fs_map)
                     if not _same_entry(base_map.get(path), head_map.get(path))
                     or not _same_entry(base_map.get(path), index_map.get(path))
                     or not _same_entry(base_map.get(path), fs_map.get(path))]
    derived_classes = [_class(os.fsdecode(path), rules, has_map, policy_path) for path in changed_paths]
    expected_class = min(derived_classes, key={"trunk": 0, "unclassified": 1, "shared": 2, "leaf": 3}.__getitem__) if derived_classes else "shared"
    _required(change_class == expected_class, "CHANGE_CLASS_MISMATCH", "declared change class does not match base policy and complete workspace diff")
    current_head = _git(["rev-parse", "--verify", "HEAD^{commit}"], cwd=root).decode("ascii").strip()
    current_manifest, *_ = _manifest(
        root, base, current_head, policy_digest, exclusions, inventory_paths, scope_digest)
    _required(current_manifest == manifest_digest, "SOURCE_CHANGED_DURING_CHECK", "source manifest changed during validation")
    _, _, final_scope_digest = _dispatch_scope(dispatch_receipt_path, root)
    _required(final_scope_digest == scope_digest, "DISPATCH_RECEIPT_CHANGED_DURING_CHECK",
              "external dispatch receipt changed during validation")
    for raw_path, digest in digests.items():
        path = root.joinpath(*os.fsdecode(raw_path).split("/"))
        try:
            info = path.lstat()
            if not stat.S_ISREG(info.st_mode) or info.st_mode & 0o111:
                raise GateError("EVIDENCE_CHANGED_DURING_CHECK", f"evidence type or mode changed during validation: {os.fsdecode(raw_path)}", 1)
            data = path.read_bytes()
        except GateError:
            raise
        except OSError as exc:
            raise GateError("EVIDENCE_CHANGED_DURING_CHECK", f"evidence disappeared during validation: {os.fsdecode(raw_path)}", 1) from exc
        _required(_sha(data) == digest, "EVIDENCE_CHANGED_DURING_CHECK",
                  f"digest changed during validation: {os.fsdecode(raw_path)}")
    if report["verdict"] == "READY":
        _required(any(check["required"] for check in check_receipt["checks"]),
                  "READY_CHECKS_MISSING", "READY requires at least one required observed check")
        for criterion in criteria_doc["criteria"]:
            if criterion["required"] and criterion["applicable"]:
                _required(by_id[criterion["id"]]["result"] == "PASS", "READY_CRITERIA_INCOMPLETE",
                          f"required criterion {criterion['id']} is not PASS")
        for check in check_receipt["checks"]:
            if check["required"]:
                _required(check["status"] == "PASS", "READY_CHECK_INCOMPLETE",
                          f"required check {check['command']} is {check['status']}")


def _classify(args: argparse.Namespace) -> int:
    root = _root()
    policy_path = _validate_repo_path(args.policy)
    if args.paths:
        policy_file = root
        for part in policy_path.split("/"):
            policy_file = policy_file / part
            if policy_file.is_symlink():
                raise GateError("POLICY_INPUT_INVALID", "candidate policy path contains a symlink")
        try:
            info = policy_file.lstat()
            if not stat.S_ISREG(info.st_mode):
                raise GateError("POLICY_INPUT_INVALID", "candidate policy is not a regular file")
            data = policy_file.read_bytes()
        except FileNotFoundError:
            data = b""
    else:
        base = args.base
        if not isinstance(base, str) or not HEX.fullmatch(base):
            raise GateError("GIT_INPUT_INVALID", "classify --base requires a full commit OID")
        commit = _git(["rev-parse", "--verify", f"{base}^{{commit}}"], cwd=root).decode("ascii").strip()
        if commit != base:
            raise GateError("GIT_INPUT_INVALID", "classify --base requires the exact full commit OID")
        head_ref = args.head or "HEAD"
        policy_head = _git(["rev-parse", "--verify", f"{head_ref}^{{commit}}"], cwd=root).decode("ascii").strip()
        if _git(["merge-base", base, policy_head], cwd=root).decode("ascii").strip() != base:
            raise GateError("GIT_INPUT_INVALID", "--head must be a descendant of --base")
        data, _ = _policy_from_base(root, base, policy_path)
        data = data or b""
    rules, has_map = _policy_text(data)
    paths = list(args.paths or [])
    if not paths:
        if not args.base:
            raise GateError("USAGE_INVALID", "classify requires --paths or --base")
        base_map, head_map = _blob_map(root, args.base), _blob_map(root, args.head or "HEAD")
        paths = [os.fsdecode(path) for path in sorted(set(base_map) | set(head_map))
                 if not _same_entry(base_map.get(path), head_map.get(path))]
    rows = []
    for raw in paths:
        path = _validate_repo_path(raw)
        rows.append({"path": path, "class": _class(path, rules, has_map, policy_path)})
    output: object = {"policy_path": policy_path, "policy_sha256": _sha(data) if data else None, "classified_from": "candidate" if args.paths else "base", "paths": rows}
    print(json.dumps(output, sort_keys=True, indent=2) if args.json else "\n".join(f"{row['class']}\t{json.dumps(row['path'], ensure_ascii=True)}" for row in rows))
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    classify = commands.add_parser("classify")
    classify.add_argument("--policy", required=True)
    group = classify.add_mutually_exclusive_group(required=True)
    group.add_argument("--paths", nargs="+")
    group.add_argument("--base")
    classify.add_argument("--head")
    classify.add_argument("--json", action="store_true")
    check = commands.add_parser("check")
    check.add_argument("--report", required=True)
    check.add_argument("--policy", required=True)
    check.add_argument("--base", required=True)
    check.add_argument("--dispatch-receipt", required=True,
                       help="external frozen scope/inventory receipt path")
    args = parser.parse_args(argv)
    try:
        if args.command == "classify":
            return _classify(args)
        root = _root()
        report_path = Path(args.report)
        if not report_path.is_absolute():
            report_path = root / report_path
        policy = _validate_repo_path(args.policy)
        dispatch_receipt = Path(args.dispatch_receipt)
        if not dispatch_receipt.is_absolute():
            dispatch_receipt = root / dispatch_receipt
        _check_report(root, report_path, policy, args.base, dispatch_receipt)
        print("CONSISTENT: declarations match observed source; this does not authenticate actors, chronology, grants, scope/receipt provenance, isolation, or human approval.")
        return 0
    except GateError as exc:
        print(f"{exc.code}: {exc}", file=sys.stderr)
        return exc.status
    except (OSError, KeyError, TypeError, ValueError, UnicodeError) as exc:
        print(f"GIT_INPUT_INVALID: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
