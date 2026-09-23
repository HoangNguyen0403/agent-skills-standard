#!/usr/bin/env python3
"""Validate a bounded, scoped view manifest."""

from __future__ import annotations

import argparse
import errno
import hashlib
import json
import os
import re
import stat
import sys
from dataclasses import dataclass
from pathlib import Path

import validate_spec

_SYSTEM_OPEN = os.open

MANIFEST_VERSION = "1.0"
MAX_FILE_BYTES = 1024 * 1024
MAX_SOURCE_BYTES = MAX_FILE_BYTES
REGENERATION = {
    "authority": "spec",
    "presentation": "drawio",
    "export": "image",
    "manual_edits": "protect",
}
DIGEST_PATTERN = re.compile(r"sha256:[0-9a-f]{64}")
IDENTITY_PATTERN = re.compile(r"^[A-Za-z][A-Za-z0-9_.:-]*$")


@dataclass(frozen=True)
class ManifestReport:
    errors: tuple[str, ...] = ()
    review_needed: tuple[str, ...] = ()

    @property
    def ok(self) -> bool:
        return not self.errors and not self.review_needed


def _secure_flags() -> tuple[int, int]:
    required = ("O_DIRECTORY", "O_NOFOLLOW", "O_NONBLOCK")
    missing = [name for name in required if not hasattr(os, name)]
    if not hasattr(os, "supports_dir_fd") or _SYSTEM_OPEN not in os.supports_dir_fd:
        missing.append("dir_fd support")
    if missing:
        raise OSError("secure directory traversal unavailable: %s" % ", ".join(missing))
    close_on_exec = getattr(os, "O_CLOEXEC", 0)
    directory_flags = os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW | close_on_exec
    file_flags = os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK | close_on_exec
    return directory_flags, file_flags


def _close_fd(descriptor: int | None) -> None:
    if descriptor is not None:
        try:
            os.close(descriptor)
        except OSError:
            pass


def _open_manifest_root(root: Path) -> int:
    directory_flags, _ = _secure_flags()
    try:
        return os.open(root, directory_flags)
    except OSError as error:
        detail = error.strerror or str(error)
        raise OSError("manifest root cannot be opened: %s" % detail) from error


def _safe_child_parts(value: object, label: str) -> tuple[str, ...]:
    if not isinstance(value, str) or not value:
        raise ValueError("%s must be a non-empty relative path" % label)
    candidate = Path(value)
    if candidate.is_absolute() or ".." in candidate.parts or "://" in value:
        raise ValueError("%s must stay inside the manifest directory" % label)
    parts = tuple(candidate.parts)
    if not parts:
        raise ValueError("%s must name a child file" % label)
    return parts



def _open_relative_file(root_fd: int, parts: tuple[str, ...], label: str) -> int:
    if not parts:
        raise ValueError("%s must name a child file" % label)
    directory_flags, file_flags = _secure_flags()
    current_fd = root_fd
    owned_directory: int | None = None
    file_descriptor: int | None = None
    try:
        for part in parts[:-1]:
            next_fd = os.open(part, directory_flags, dir_fd=current_fd)
            _close_fd(owned_directory)
            owned_directory = next_fd
            current_fd = next_fd
        file_descriptor = os.open(parts[-1], file_flags, dir_fd=current_fd)
        mode = os.fstat(file_descriptor).st_mode
        if not stat.S_ISREG(mode):
            raise OSError("%s must be an ordinary file" % label)
        return file_descriptor
    except OSError as error:
        _close_fd(file_descriptor)
        if error.errno == errno.ELOOP:
            raise OSError("%s has symlink components" % label) from error
        detail = error.strerror or str(error)
        raise OSError("%s cannot be opened safely: %s" % (label, detail)) from error
    finally:
        _close_fd(owned_directory)


def _read_bounded(root_fd: int, parts: tuple[str, ...], label: str) -> bytes:
    descriptor = _open_relative_file(root_fd, parts, label)
    chunks = []
    total = 0
    try:
        while True:
            chunk = os.read(descriptor, min(64 * 1024, MAX_FILE_BYTES + 1 - total))
            if not chunk:
                break
            total += len(chunk)
            if total > MAX_FILE_BYTES:
                raise OSError("%s exceeds %d byte bound" % (label, MAX_FILE_BYTES))
            chunks.append(chunk)
    except OSError as error:
        if "byte bound" in str(error):
            raise
        detail = error.strerror or str(error)
        raise OSError("%s read failed: %s" % (label, detail)) from error
    finally:
        _close_fd(descriptor)
    return b"".join(chunks)


def _read_json_from_root(root_fd: int, parts: tuple[str, ...]):
    payload = _read_bounded(root_fd, parts, "JSON file")
    return json.loads(payload.decode("utf-8"))


def _source_digest(root_fd: int, parts: tuple[str, ...]) -> str:
    payload = _read_bounded(root_fd, parts, "source")
    return "sha256:" + hashlib.sha256(payload).hexdigest()


def _citation_source(evidence: object) -> str | None:
    if not isinstance(evidence, str):
        return None
    source, separator, line = evidence.rpartition(":")
    if separator and source and line.isdigit():
        return Path(source).as_posix()
    return None


def _is_ancestor(ancestor: str, descendant: str, refines: dict[str, set[str]]) -> bool:
    if ancestor == descendant:
        return True
    pending = [descendant]
    seen: set[str] = set()
    while pending:
        current = pending.pop()
        if current in seen:
            continue
        seen.add(current)
        for parent in refines.get(current, set()):
            if parent == ancestor:
                return True
            pending.append(parent)
    return False


def _compatible(left: str, right: str, refines: dict[str, set[str]]) -> bool:
    """Allow equality or a direct ancestor/descendant relation, never sibling ancestry."""
    return _is_ancestor(left, right, refines) or _is_ancestor(right, left, refines)


def _cycle_nodes(graph: dict[str, set[str]]) -> list[tuple[str, ...]]:
    """Find cycles iteratively so deep refinement graphs cannot overflow the stack."""
    cycles: list[tuple[str, ...]] = []
    state: dict[str, int] = {}
    for start in graph:
        if state.get(start, 0) == 2:
            continue
        path: list[str] = [start]
        positions: dict[str, int] = {start: 0}
        state[start] = 1
        stack = [(start, iter(graph.get(start, ())))]
        while stack:
            node, children = stack[-1]
            try:
                child = next(children)
            except StopIteration:
                stack.pop()
                state[node] = 2
                positions.pop(node, None)
                path.pop()
                continue
            child_state = state.get(child, 0)
            if child_state == 0:
                state[child] = 1
                positions[child] = len(path)
                path.append(child)
                stack.append((child, iter(graph.get(child, ()))))
            elif child_state == 1:
                start_index = positions.get(child)
                if start_index is not None:
                    cycles.append(tuple(path[start_index:] + [child]))
    return cycles


def _append_source_review(
    item: dict, source_records: dict[str, dict], review_needed: list[str], owner: str
) -> None:
    source = _citation_source(item.get("evidence"))
    if not source:
        review_needed.append("%s evidence citation has no path:line source" % owner)
        return
    record = source_records.get(source)
    if record is None:
        review_needed.append("%s source %s is not allowlisted; review-needed" % (owner, source))
        return
    capture = item.get("evidence_digest")
    revision = item.get("evidence_revision")
    if capture != record["digest"] or revision != record["revision"]:
        review_needed.append("%s source %s capture differs; review-needed" % (owner, source))


def _load_sources(
    manifest: dict, root: Path, root_fd: int,
    errors: list[str], review_needed: list[str]
) -> dict[str, dict]:
    raw_sources = manifest.get("sources")
    if not isinstance(raw_sources, list):
        errors.append("manifest sources must be a list of bounded local records")
        return {}
    records: dict[str, dict] = {}
    seen_ids: set[str] = set()
    for index, record in enumerate(raw_sources):
        owner = "source %d" % index
        if not isinstance(record, dict):
            errors.append("%s must be an object" % owner)
            continue
        source_id = record.get("id")
        source_value = record.get("path")
        if (not isinstance(source_id, str) or
                not IDENTITY_PATTERN.fullmatch(source_id) or source_id in seen_ids):
            errors.append("%s needs a unique canonical id" % owner)
            continue
        seen_ids.add(source_id)
        try:
            source_parts = _safe_child_parts(source_value, "source path")
        except (OSError, ValueError) as error:
            errors.append("%s: %s" % (owner, error))
            continue
        source = Path(*source_parts).as_posix()
        revision = record.get("revision")
        digest = record.get("digest")
        if not isinstance(revision, str) or not revision:
            errors.append("%s revision must be a non-empty string" % owner)
        if not isinstance(digest, str) or not DIGEST_PATTERN.fullmatch(digest):
            errors.append("%s digest must be sha256:<64 lowercase hex chars>" % owner)
        if source in records:
            errors.append("duplicate source path: %s" % source)
            continue
        records[source] = {"id": source_id, "path": source, "revision": revision,
                           "digest": digest}
        try:
            actual = _source_digest(root_fd, source_parts)
        except OSError as error:
            review_needed.append("source %s unavailable (%s); review-needed" % (source, error))
        else:
            if actual != digest:
                review_needed.append("source %s digest changed; review-needed" % source)
    return records


def _validate_manifest_data(
    manifest: object, root: Path, root_fd: int
) -> ManifestReport:
    errors: list[str] = []
    review_needed: list[str] = []
    if not isinstance(manifest, dict):
        return ManifestReport(("manifest must be a JSON object",), ())
    if manifest.get("version") != MANIFEST_VERSION:
        errors.append("manifest version must be %s" % MANIFEST_VERSION)
    if manifest.get("regeneration") != REGENERATION:
        errors.append("regeneration must declare spec authority, drawio presentation, image export, "
                      "and manual_edits=protect")
    source_records = _load_sources(manifest, root, root_fd, errors, review_needed)
    views = manifest.get("views")
    if not isinstance(views, list) or not views:
        return ManifestReport(tuple(dict.fromkeys(errors + ["manifest needs at least one view"])),
                              tuple(dict.fromkeys(review_needed)))

    identities: dict[str, list[dict]] = {}
    refines: dict[str, set[str]] = {}
    owners: dict[str, set[str]] = {}
    relationships: dict[str, list[dict]] = {}
    view_ids: set[str] = set()

    for view_index, view in enumerate(views):
        if not isinstance(view, dict):
            errors.append("view %d must be an object" % view_index)
            continue
        view_id = view.get("id")
        if not isinstance(view_id, str) or not IDENTITY_PATTERN.fullmatch(view_id):
            errors.append("view %d needs a canonical id" % view_index)
            continue
        if view_id in view_ids:
            errors.append("duplicate view id: %s" % view_id)
            continue
        view_ids.add(view_id)
        scope = view.get("scope")
        expected = view.get("relationships")
        if not isinstance(scope, list) or not scope or any(
                not isinstance(identity, str) or not IDENTITY_PATTERN.fullmatch(identity)
                for identity in scope):
            errors.append("view %s scope must be a non-empty identity list" % view_id)
            scope = []
        if not isinstance(expected, list) or any(
                not isinstance(identity, str) or not IDENTITY_PATTERN.fullmatch(identity)
                for identity in expected):
            errors.append("view %s relationships must be an identity list" % view_id)
            expected = []
        try:
            spec_parts = _safe_child_parts(view.get("spec"), "view spec path")
            spec = _read_json_from_root(root_fd, spec_parts)
        except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
            errors.append("view %s: %s" % (view_id, error))
            continue
        errors.extend("view %s: %s" % (view_id, error)
                      for error in validate_spec.validate(spec, require_contract=True))
        if not isinstance(spec, dict):
            continue
        view_contract = spec.get("view")
        if isinstance(view_contract, dict) and view_contract.get("evidence"):
            _append_source_review(view_contract, source_records, review_needed,
                                  "view %s" % view_id)
        nodes = spec.get("nodes") if isinstance(spec.get("nodes"), list) else []
        edges = spec.get("edges") if isinstance(spec.get("edges"), list) else []
        local_identities: dict[str, str] = {}
        local_relationships: dict[str, tuple[str, str]] = {}
        observed_relationships: set[str] = set()
        for node in nodes:
            if not isinstance(node, dict):
                continue
            local_id = node.get("id")
            identity = node.get("identity")
            if not isinstance(local_id, str) or not isinstance(identity, str):
                continue
            if identity in local_identities.values():
                errors.append("view %s duplicates canonical identity %s" % (view_id, identity))
            local_identities[local_id] = identity
            identities.setdefault(identity, []).append({"view": view_id, "item": node})
            parents = node.get("refines", [])
            if isinstance(parents, list):
                refines.setdefault(identity, set()).update(
                    parent for parent in parents if isinstance(parent, str))
            owner = node.get("owner")
            if isinstance(owner, str):
                owners.setdefault(identity, set()).add(owner)
            if identity not in scope:
                errors.append("view %s node %s is outside its declared scope" % (view_id, local_id))
            if node.get("evidence"):
                _append_source_review(node, source_records, review_needed,
                                      "element %s" % identity)
        local_scope = set(local_identities.values())
        for scoped_identity in scope:
            if scoped_identity not in local_scope:
                errors.append("view %s scope identity %s is absent from local nodes" %
                              (view_id, scoped_identity))
        for edge in edges:
            if not isinstance(edge, dict):
                continue
            source_id, target_id = edge.get("from"), edge.get("to")
            relation_id = edge.get("identity")
            if (not isinstance(source_id, str) or not isinstance(target_id, str) or
                    not isinstance(relation_id, str)):
                continue
            source = local_identities.get(source_id)
            target = local_identities.get(target_id)
            if source is None or target is None:
                continue
            pair = (source, target)
            prior_pair = local_relationships.get(relation_id)
            if prior_pair is not None and prior_pair != pair:
                errors.append("view %s relationship %s has conflicting local endpoints" %
                              (view_id, relation_id))
                continue
            local_relationships[relation_id] = pair
            if source not in scope or target not in scope:
                errors.append("view %s relationship %s -> %s is outside its declared scope" %
                              (view_id, source, target))
            observed_relationships.add(relation_id)
            relationships.setdefault(relation_id, []).append({
                "view": view_id, "from": source, "to": target,
            })
            if edge.get("evidence"):
                _append_source_review(edge, source_records, review_needed,
                                      "relationship %s" % relation_id)
        missing = set(expected) - observed_relationships
        errors.extend("view %s is missing expected relationship %s" % (view_id, relation)
                      for relation in sorted(missing))

    known = set(identities)
    for identity, records in identities.items():
        for record in records:
            node = record["item"]
            parents = node.get("refines", [])
            if isinstance(parents, list):
                for parent in parents:
                    if isinstance(parent, str) and parent not in known:
                        errors.append("element %s refines unknown identity %s" % (identity, parent))
            owner = node.get("owner")
            if isinstance(owner, str) and owner not in known:
                errors.append("element %s owns unknown identity %s" % (identity, owner))

    errors.extend("refinement cycle: %s" % " -> ".join(cycle)
                  for cycle in _cycle_nodes(refines))
    errors.extend("ownership cycle: %s" % " -> ".join(cycle)
                  for cycle in _cycle_nodes(owners))
    for relation_id, records in relationships.items():
        for index, left in enumerate(records):
            for right in records[index + 1:]:
                if (not _compatible(left["from"], right["from"], refines) or
                        not _compatible(left["to"], right["to"], refines)):
                    errors.append("relationship %s is inconsistent across scoped views" %
                                  relation_id)

    return ManifestReport(tuple(dict.fromkeys(errors)), tuple(dict.fromkeys(review_needed)))


def validate_manifest(path: str | Path) -> ManifestReport:
    """Validate using the caller-selected manifest directory as the trust boundary."""
    manifest_path = Path(path)
    root = manifest_path.parent
    root_fd: int | None = None
    try:
        root_fd = _open_manifest_root(root)
        manifest = _read_json_from_root(root_fd, (manifest_path.name,))
    except (OSError, UnicodeDecodeError, json.JSONDecodeError, ValueError) as error:
        _close_fd(root_fd)
        return ManifestReport(("cannot read manifest: %s" % error,), ())
    try:
        return _validate_manifest_data(manifest, root, root_fd)
    finally:
        _close_fd(root_fd)

def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Validate a diagram view manifest.")
    parser.add_argument("manifest", help="path to the manifest JSON file")
    args = parser.parse_args(argv)
    report = validate_manifest(args.manifest)
    for error in report.errors:
        sys.stderr.write("%s\n" % error)
    for finding in report.review_needed:
        sys.stderr.write("review-needed: %s\n" % finding)
    if report.errors:
        return 1
    return 2 if report.review_needed else 0


if __name__ == "__main__":
    sys.exit(main())
