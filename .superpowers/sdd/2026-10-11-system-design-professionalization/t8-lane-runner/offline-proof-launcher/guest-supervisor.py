#!/usr/bin/python3.13
"""Trusted guest controller for preparation, bounded harmless fixtures and read-only inspection."""
from __future__ import annotations

import argparse
import fcntl
import errno
import ctypes
import hashlib
import json
import math
import os
from dataclasses import dataclass
from pathlib import Path, PurePath
import platform
import select
import selectors
import signal
import stat
import subprocess
import socket
import gzip
import re
import sys
import time
from typing import Any, Literal, NoReturn

MIB = 1024 * 1024
ROOT = Path("/opt/offline-proof")
MANIFEST_PATH = ROOT / "manifest.json"
BOOTSTRAP = ROOT / "bootstrap.py"
FIXTURE = ROOT / "harmless-fixture.py"
POLICY_PATH = ROOT / "policy.json"
SERIAL = Path("/dev/hvc0")
MAX_MANIFEST = 64 * MIB
MAX_STREAM = 16 * MIB
MAX_RECORD = 64 * MIB
CHUNK = MIB
PREPARATION_BUDGET_SECONDS = 900.0
INSPECTION_BUDGET_MAX_MS = 300_000
UID = 65532
GID = 65532


class GuestError(RuntimeError):
    pass


def fail(message: str) -> "NoReturn":
    raise GuestError(message)


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def strict_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            fail(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def bounded_file(path: Path, maximum: int) -> bytes:
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_size > maximum:
            fail(f"invalid bounded file: {path}")
        out = bytearray()
        while len(out) <= maximum:
            block = os.read(fd, min(CHUNK, maximum + 1 - len(out)))
            if not block:
                return bytes(out)
            out.extend(block)
        fail(f"file exceeds bound: {path}")
    finally:
        os.close(fd)


def load_manifest(expected: str | None = None) -> dict[str, Any]:
    raw = bounded_file(MANIFEST_PATH, MAX_MANIFEST)
    try:
        manifest = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=strict_pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GuestError("manifest JSON invalid") from exc
    if type(manifest) is not dict or manifest.get("schema") != "offline-proof-manifest-v1":
        fail("manifest schema mismatch")
    body = dict(manifest)
    supplied = body.pop("manifest_sha256", None)
    digest = sha256(canonical(body))
    if supplied != digest or (expected is not None and expected != digest):
        fail("manifest digest mismatch")
    if manifest.get("execution_policy", {}).get("operator_execution") != "DENY":
        fail("operator execution is not explicitly denied")
    return manifest


def verify_closure(manifest: dict[str, Any]) -> None:
    rows = manifest.get("source_files", []) + manifest.get("packet_files", []) + manifest.get("grader_files", []) + [manifest.get("native_manifest")]
    root = ROOT / "closure"
    seen: set[str] = set()
    for row in rows:
        if type(row) is not dict or type(row.get("path")) is not str or row["path"] in seen:
            fail("manifest closure row malformed or repeated")
        seen.add(row["path"])
        path = Path(*PurePath(row["path"]).parts)
        if path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts):
            fail("manifest contains unsafe path")
        raw = bounded_file(root / path, int(row["bytes"]))
        if len(raw) != row["bytes"] or sha256(raw) != row["sha256"]:
            fail(f"staged source changed: {row['path']}")
    source_map = manifest.get("source_map")
    if type(source_map) is not dict or set(source_map) != {"path", "raw_sha256", "phase_context"} or source_map.get("path") != "authority/source-map.json" or type(source_map.get("raw_sha256")) is not str or not re.fullmatch(r"[0-9a-f]{64}", source_map["raw_sha256"]) or source_map.get("phase_context") != {"phase": "preparation", "approved_plan_sha256": manifest.get("approved_plan_sha256")}:
        fail("manifest source-map descriptor is malformed or phase-unbound")
    source_map_raw = bounded_file(ROOT / "source-map.json", 64 * MIB)
    if sha256(source_map_raw) != source_map["raw_sha256"]:
        fail("staged independent source map differs from its manifest/release-bound raw digest")
    try:
        source_map_document = json.loads(source_map_raw.decode("utf-8", "strict"), object_pairs_hook=strict_pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GuestError("staged source-map JSON invalid") from exc
    if type(source_map_document) is not dict or set(source_map_document) != {"schema", "phase", "approved_plan_sha256", "files"} or source_map_document.get("schema") != "offline-proof-source-map-v1" or source_map_document.get("phase") != "preparation" or source_map_document.get("approved_plan_sha256") != manifest.get("approved_plan_sha256") or type(source_map_document.get("files")) is not list:
        fail("staged source-map schema/phase/plan contract mismatch")
    manifest_rows = sorted(manifest.get("source_files", []) + manifest.get("packet_files", []) + manifest.get("grader_files", []) + [manifest.get("native_manifest")], key=lambda row: row.get("path", "") if type(row) is dict else "")
    expected_rows = [{"path": row["path"], "class": row["class"], "bytes": row["bytes"], "sha256": row["sha256"]} for row in manifest_rows]
    if source_map_document["files"] != expected_rows:
        fail("staged manifest closure differs from the externally pinned source-map membership")
TARGET_VIEW_DYNAMIC = {
    "/proc/self": ("proc-self-link", 0),
    "/proc/self/status": ("proc-status", 4 * MIB),
    "/proc/self/cgroup": ("proc-cgroup", 64 * 1024),
    "/proc/self/fd": ("loader-fd-directory", 0),
    "/proc/self/fd/3": ("verified-libseccomp-fd", 16 * MIB),
    "/proc/sys/kernel/cap_last_cap": ("proc-cap-last-cap", 4096),
    "/proof/cgroup-diagnostics/pids.events": ("cgroup-pids-events", 64 * 1024),
    "/proof/cgroup-diagnostics/pids.max": ("cgroup-pids-max", 4096),
}
TARGET_VIEW_WRITABLE_DIRS = {"/proof/home", "/proof/tmp", "/proof/scratch", "/proof/reserved-mapping"}
TARGET_VIEW_FIXED_PATHS = {
    "/proc", "/proc/self", "/proc/self/status", "/proc/self/cgroup", "/proc/self/fd", "/proc/self/fd/3",
    "/proc/sys", "/proc/sys/kernel", "/proc/sys/kernel/cap_last_cap",
    "/proof", "/proof/out", "/proof/home", "/proof/tmp", "/proof/scratch", "/proof/reserved-mapping",
    "/proof/cgroup-diagnostics", "/proof/cgroup-diagnostics/pids.events", "/proof/cgroup-diagnostics/pids.max",
}
TARGET_VIEW_FIXED_KINDS = {
    "/": "directory",
    "/proc": "directory", "/proc/sys": "directory", "/proc/sys/kernel": "directory",
    "/proc/self": "dynamic", "/proc/self/status": "dynamic", "/proc/self/cgroup": "dynamic",
    "/proc/self/fd": "dynamic", "/proc/self/fd/3": "dynamic",
    "/proc/sys/kernel/cap_last_cap": "dynamic",
    "/proof": "directory", "/proof/out": "directory", "/proof/home": "directory", "/proof/tmp": "directory",
    "/proof/scratch": "directory", "/proof/reserved-mapping": "directory", "/proof/cgroup-diagnostics": "directory",
    "/proof/cgroup-diagnostics/pids.events": "dynamic", "/proof/cgroup-diagnostics/pids.max": "dynamic",
}
TARGET_VIEW_INTERFACES = [
    {"name": "live-direct-task-ids-v1", "fd": 4, "transport": "seqpacket", "request": "LIST_TASK_IDS", "maximum_requests": 16, "maximum_request_bytes": 13, "response_schema": "offline-proof-task-list-v1", "maximum_response_bytes": 4096, "maximum_tids": 3},
    {"name": "verified-libseccomp-object-v1", "fd": 3, "path": "/proc/self/fd/3", "identity_source": "prepared-runtime-identity", "loader": "dlopen-held-fd"},
]
TARGET_VIEW_MAGIC = b"QF5TVIEW\x01"


def read_target_view_device(params: dict[str, str], manifest: dict[str, Any]) -> dict[str, Any]:
    device = Path("/dev/sda2")
    view_sys = Path("/sys/class/block/sda2")
    root_sys = Path("/sys/class/block/sda1")
    if device.is_symlink() or not stat.S_ISBLK(device.lstat().st_mode) or not view_sys.is_dir() or not root_sys.is_dir():
        fail("runtime and target-view partitions are not the fixed single readonly USB input")
    root_partition_bytes = int(params["offlineproof.prepared_root_partition_bytes"])
    expected_root_sectors = root_partition_bytes // 512
    expected_view_start = int(params["offlineproof.target_view_start"])
    expected_view_start_from_root = ((2048 + expected_root_sectors + 2047) // 2048) * 2048
    root_start = (root_sys / "start").read_text(encoding="ascii").strip()
    root_size = (root_sys / "size").read_text(encoding="ascii").strip()
    root_ro = (root_sys / "ro").read_text(encoding="ascii").strip()
    view_start = (view_sys / "start").read_text(encoding="ascii").strip()
    sectors_text = (view_sys / "size").read_text(encoding="ascii").strip()
    view_ro = (view_sys / "ro").read_text(encoding="ascii").strip()
    root_fd = os.open("/dev/sda1", os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        root_hash = hashlib.sha256()
        root_bytes = 0
        while root_bytes < root_partition_bytes:
            block = os.read(root_fd, min(CHUNK, root_partition_bytes - root_bytes))
            if not block:
                fail("short read from the mounted prepared root partition")
            root_hash.update(block)
            root_bytes += len(block)
        if root_hash.hexdigest() != params["offlineproof.prepared_root_partition_sha256"]:
            fail("mounted runtime root partition bytes differ from prepared partition identity")
    finally:
        os.close(root_fd)
    if root_start != "2048" or root_size != str(expected_root_sectors) or root_ro != "1" or view_start != str(expected_view_start) or expected_view_start != expected_view_start_from_root or view_ro != "1":
        fail("single-device runtime/input partition geometry or readonly state differs from the fixed GPT layout")
    if not sectors_text.isdigit() or not 2 <= int(sectors_text) <= (16 * MIB // 512) + 1:
        fail("target-view partition exceeds the fixed raw-map bound")
    device_bytes = int(sectors_text) * 512
    fd = os.open(device, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        info = os.fstat(fd)
        if not stat.S_ISBLK(info.st_mode):
            fail("target-view transport descriptor is not a block device")
        raw_device = bytearray()
        while len(raw_device) < device_bytes:
            block = os.read(fd, min(CHUNK, device_bytes - len(raw_device)))
            if not block:
                fail("short read from the fixed target-view block partition")
            raw_device.extend(block)
    finally:
        os.close(fd)
    header = bytes(raw_device[:512])
    if len(header) != 512 or header[:len(TARGET_VIEW_MAGIC)] != TARGET_VIEW_MAGIC or any(header[49:]):
        fail("target-view block framing header is invalid")
    raw_length = int.from_bytes(header[9:17], "big")
    header_sha = header[17:49].hex()
    if not 1 <= raw_length <= 16 * MIB or 512 + raw_length > device_bytes:
        fail("target-view framed payload length is outside bounds")
    raw = bytes(raw_device[512:512 + raw_length])
    if any(raw_device[512 + raw_length:]) or header_sha != params["offlineproof.target_view_sha256"] or sha256(raw) != header_sha:
        fail("target-view framed bytes differ from independent cmdline digest or zero padding")
    context = {
        "approved_plan_sha256": manifest["approved_plan_sha256"],
        "source_map_sha256": manifest["source_map"]["raw_sha256"],
        "prepared_manifest_sha256": manifest["manifest_sha256"],
        "prepared_runtime_identity_sha256": params["offlineproof.runtime_identity"],
        "prepared_runtime_image_sha256": params["offlineproof.prepared_image_sha256"],
        "preparation_claim_sha256": params["offlineproof.preparation_claim_sha256"],
    }
    return parse_target_view(raw, expected_sha256=params["offlineproof.target_view_sha256"], context=context)


def parse_target_view(raw: bytes, *, expected_sha256: str, context: dict[str, Any]) -> dict[str, Any]:
    if sha256(raw) != expected_sha256:
        fail("target-view map raw digest differs from the independent release")
    try:
        value = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=strict_pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GuestError("target-view map JSON invalid") from exc
    if type(value) is not dict or set(value) != {"schema", "phase", "context", "entries", "descriptors", "interfaces"} or value.get("schema") != "offline-proof-target-view-v1" or value.get("phase") != "fixture" or value.get("context") != context or value.get("descriptors") != ["stdin", "stdout", "stderr"] or value.get("interfaces") != TARGET_VIEW_INTERFACES:
        fail("target-view schema, external digest, phase, lineage or inherited interface mismatch")
    entries = value.get("entries")
    if type(entries) is not list or not entries or len(entries) > 20000:
        fail("target-view entry list is absent or over capacity")
    previous = ""
    seen: set[str] = set()
    directories: set[str] = set()
    required_dynamic = set(TARGET_VIEW_DYNAMIC)
    source_bytes = 0
    for row in entries:
        if type(row) is not dict or type(row.get("path")) is not str or not row["path"].startswith("/") or "\\" in row["path"] or len(row["path"]) > 4096 or any(ord(char) < 33 or ord(char) > 126 for char in row["path"]) or (row["path"] != "/" and any(part in {"", ".", ".."} for part in row["path"].split("/")[1:])):
            fail("target-view contains a non-normalized or unbounded guest path")
        path = row["path"]
        if any(path == prefix or path.startswith(prefix + "/") for prefix in ("/dev", "/sys", "/run", "/tmp", "/home", "/root")):
            fail("target-view cannot expose device, sysfs, host runtime, temporary or account paths")
        if path.startswith("/proof") and path not in TARGET_VIEW_FIXED_PATHS:
            fail("target-view proof path exceeds the fixed writable/input closure")
        if path.startswith("/proc") and path not in TARGET_VIEW_FIXED_PATHS:
            fail("target-view proc path exceeds the exact dynamic-read closure")
        if path in seen or path <= previous:
            fail("target-view entries are duplicate or not sorted")
        seen.add(path)
        previous = path
        kind = row.get("kind")
        expected_kind = TARGET_VIEW_FIXED_KINDS.get(path)
        if (expected_kind is not None and kind != expected_kind) or (path == "/" and kind != "directory"):
            fail("target-view fixed infrastructure path has the wrong entry type")
        if kind == "regular":
            if set(row) != {"path", "kind", "bytes", "sha256", "mode", "uid", "gid"} or type(row["bytes"]) is not int or row["bytes"] < 0 or type(row["sha256"]) is not str or not re.fullmatch(r"[0-9a-f]{64}", row["sha256"]) or any(type(row[key]) is not int or row[key] < 0 for key in ("mode", "uid", "gid")) or row["mode"] & ~0o7777:
                fail("target-view regular-file row malformed")
            source_bytes += row["bytes"]
            if source_bytes > 8 * 1024 * 1024 * 1024:
                fail("target-view source closure exceeds the fixed eight-GiB aggregate bound")
        elif kind == "directory":
            source_keys = {"source_mode", "source_uid", "source_gid"}
            has_source_identity = source_keys.issubset(row)
            if (source_keys & set(row)) and (not has_source_identity or path in TARGET_VIEW_FIXED_PATHS):
                fail("target-view source directory identity is incomplete or unused")
            if has_source_identity:
                if set(row) != {"path", "kind", "mode", "uid", "gid", *source_keys} or any(type(row[key]) is not int or row[key] < 0 for key in source_keys) or row["source_mode"] & ~0o7777:
                    fail("target-view source directory identity is malformed")
            elif set(row) != {"path", "kind", "mode", "uid", "gid"}:
                fail("target-view directory row malformed")
            if any(type(row[key]) is not int or row[key] < 0 for key in ("mode", "uid", "gid")) or row["mode"] & ~0o7777:
                fail("target-view generated directory metadata is malformed")
            if path not in TARGET_VIEW_FIXED_PATHS and not has_source_identity:
                fail("runtime source directories require separate observed source metadata")
            directories.add(path)
            if path in TARGET_VIEW_WRITABLE_DIRS:
                if (row["uid"], row["gid"], row["mode"]) != (UID, GID, 0o700):
                    fail(f"writable target-view directory differs from fixed owned policy: {path}")
            elif row["uid"] != 0 or row["gid"] != 0 or row["mode"] & 0o222:
                fail(f"non-writable target-view directory is not root-owned/read-only: {path}")
        elif kind == "symlink":
            if set(row) != {"path", "kind", "target"} or type(row.get("target")) is not str or not row["target"] or len(row["target"]) > 4096 or "\\" in row["target"] or any(ord(char) < 33 or ord(char) > 126 for char in row["target"]):
                fail("target-view symlink row malformed")
            target = PurePath(path).parent.joinpath(row["target"])
            resolved = PurePath(os.path.normpath(str(PurePath(path).parent / row["target"] if not row["target"].startswith("/") else row["target"])))
            if not resolved.is_absolute() or str(resolved) not in {item["path"] for item in entries}:
                fail("target-view symlink target is not another explicitly mapped entry")
        elif kind == "dynamic":
            if set(row) != {"path", "kind", "operation", "maximum_bytes"} or TARGET_VIEW_DYNAMIC.get(path) != (row.get("operation"), row.get("maximum_bytes")) or type(row["maximum_bytes"]) is not int:
                fail("target-view dynamic read is not one of the typed bounded operations")
            required_dynamic.discard(path)
            if path in {"/proc/self", "/proc/self/fd"}:
                directories.add(path)
        else:
            fail("target-view contains an unknown entry kind")
    if required_dynamic:
        fail(f"target-view omits required typed dynamic reads: {sorted(required_dynamic)}")
    missing_fixed = set(TARGET_VIEW_FIXED_KINDS) - seen
    if missing_fixed:
        fail(f"target-view omits required fixed infrastructure entries: {sorted(missing_fixed)}")
    entry_by_path = {row["path"]: row for row in entries}
    for row in entries:
        parent = str(PurePath(row["path"]).parent)
        while parent != "/":
            if entry_by_path.get(parent, {}).get("kind") == "symlink":
                fail(f"target-view entries must use canonical paths beneath symlink aliases: {row['path']}")
            parent = str(PurePath(parent).parent)
        if row["kind"] == "symlink":
            target = row["target"]
            resolved = PurePath(os.path.normpath(str(PurePath(row["path"]).parent / target if not target.startswith("/") else target)))
            cursor = str(resolved)
            chain = {row["path"]}
            while resolved.is_absolute() and cursor in entry_by_path:
                if cursor in chain:
                    fail("target-view symlink chain contains a cycle")
                chain.add(cursor)
                target_row = entry_by_path[cursor]
                if target_row["kind"] == "directory":
                    directories.add(row["path"])
                    break
                if target_row["kind"] != "symlink":
                    break
                next_target = target_row["target"]
                resolved = PurePath(os.path.normpath(str(PurePath(cursor).parent / next_target if not next_target.startswith("/") else next_target)))
                cursor = str(resolved)
            else:
                fail("target-view symlink chain does not reach an explicitly mapped entry")
    for row in entries:
        parent = str(PurePath(row["path"]).parent)
        while parent != "/":
            if parent not in directories:
                fail(f"target-view omits explicit parent directory: {parent}")
            parent = str(PurePath(parent).parent)
    return value
VIEW_BIND = 4096
VIEW_REMOUNT = 32
VIEW_RDONLY = 1
VIEW_NOSUID = 2
VIEW_NODEV = 4
VIEW_NOEXEC = 8


def _view_target(root: Path, guest_path: str) -> Path:
    relative = PurePath(guest_path)
    if not relative.is_absolute() or any(part in {"", ".", ".."} for part in relative.parts[1:]):
        fail("target-view path is not an absolute normalized guest path")
    return root.joinpath(*relative.parts[1:])


def _open_runtime_parent(guest_path: str) -> tuple[int, str | None]:
    parts = PurePath(guest_path).parts[1:]
    parent_fd = os.open("/", os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0))
    try:
        if not parts:
            return parent_fd, None
        for component in parts[:-1]:
            next_fd = os.open(component, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
            if not stat.S_ISDIR(os.fstat(next_fd).st_mode):
                os.close(next_fd)
                fail(f"runtime source parent is not a physical directory: {guest_path}")
            os.close(parent_fd)
            parent_fd = next_fd
        return parent_fd, parts[-1]
    except BaseException:
        os.close(parent_fd)
        raise

def _verify_view_source_directory(row: dict[str, Any]) -> None:
    parent_fd, leaf = _open_runtime_parent(row["path"])
    try:
        fd = parent_fd if leaf is None else os.open(leaf, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        try:
            info = os.fstat(fd)
            expected = (row["source_mode"], row["source_uid"], row["source_gid"])
            observed = (stat.S_IMODE(info.st_mode), info.st_uid, info.st_gid)
            if not stat.S_ISDIR(info.st_mode) or observed != expected:
                fail(f"target-view source directory metadata differs: {row['path']}")
        finally:
            if leaf is not None:
                os.close(fd)
    finally:
        os.close(parent_fd)


def _verify_view_source_symlink(row: dict[str, Any]) -> None:
    parent_fd, leaf = _open_runtime_parent(row["path"])
    if leaf is None:
        os.close(parent_fd)
        fail("runtime root cannot be a target-view symlink")
    try:
        info = os.stat(leaf, dir_fd=parent_fd, follow_symlinks=False)
        target = os.readlink(leaf, dir_fd=parent_fd)
        if not stat.S_ISLNK(info.st_mode) or target != row["target"]:
            fail(f"target-view source symlink differs: {row['path']}")
    finally:
        os.close(parent_fd)


def _read_view_source(row: dict[str, Any]) -> tuple[int, bytes]:
    parent_fd, leaf = _open_runtime_parent(row["path"])
    if leaf is None:
        os.close(parent_fd)
        fail("runtime root cannot be a regular-file source")
    try:
        fd = os.open(leaf, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
    finally:
        os.close(parent_fd)
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or (before.st_size, stat.S_IMODE(before.st_mode), before.st_uid, before.st_gid) != (row["bytes"], row["mode"], row["uid"], row["gid"]):
            fail(f"target-view source metadata differs: {row['path']}")
        digest = hashlib.sha256()
        total = 0
        while total <= row["bytes"]:
            block = os.read(fd, min(CHUNK, row["bytes"] + 1 - total))
            if not block:
                break
            total += len(block)
            digest.update(block)
        after = os.fstat(fd)
        if total != row["bytes"] or digest.hexdigest() != row["sha256"] or (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns):
            fail(f"target-view source bytes or identity differ: {row['path']}")
        return fd, digest.digest()
    except BaseException:
        os.close(fd)
        raise


def load_runtime_identity_for_handoff(manifest: dict[str, Any], expected_sha256: str) -> dict[str, Any]:
    identity_path = ROOT / "runtime.json"
    info = identity_path.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o400 or info.st_nlink != 1:
        fail("prepared runtime identity is not an immutable root-owned regular file")
    raw = bounded_file(identity_path, 64 * 1024)
    try:
        identity = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=strict_pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise GuestError("prepared runtime identity JSON invalid") from exc
    keys = {"schema", "manifest_sha256", "architecture", "kernel_release", "rootfs_uuid", "libseccomp_path", "libseccomp_sha256", "libseccomp_bytes", "libseccomp_package_version", "package_versions"}
    runtime = manifest.get("guest_runtime")
    packages = runtime.get("package_versions") if type(runtime) is dict else None
    kernel_names = [name.removeprefix("linux-image-") for name in packages if type(name) is str and name.startswith("linux-image-")] if type(packages) is dict else []
    if type(identity) is not dict or set(identity) != keys or sha256(canonical(identity)) != expected_sha256 or type(packages) is not dict or (
        identity.get("schema") != "offline-proof-guest-runtime-v1"
        or identity.get("manifest_sha256") != manifest.get("manifest_sha256")
        or identity.get("architecture") != "aarch64"
        or identity.get("package_versions") != packages
        or len(kernel_names) != 1
        or identity.get("kernel_release") != kernel_names[0]
        or identity.get("libseccomp_package_version") != runtime.get("libseccomp")
        or type(identity.get("rootfs_uuid")) is not str
        or not re.fullmatch(r"[0-9a-fA-F-]{36}", identity["rootfs_uuid"])
        or type(identity.get("libseccomp_path")) is not str
        or not identity["libseccomp_path"].startswith("/usr/lib/aarch64-linux-gnu/libseccomp.so.2.")
        or ".." in Path(identity["libseccomp_path"]).parts
        or type(identity.get("libseccomp_sha256")) is not str
        or not re.fullmatch(r"[0-9a-f]{64}", identity["libseccomp_sha256"])
        or type(identity.get("libseccomp_bytes")) is not int
        or not 20 <= identity["libseccomp_bytes"] <= 16 * MIB
    ):
        fail("prepared runtime identity is not bound to the manifest and external runtime digest")
    return identity


def open_verified_libseccomp_fd(identity: dict[str, Any], target_view: dict[str, Any]) -> int:
    path = identity["libseccomp_path"]
    rows = [row for row in target_view["entries"] if row.get("path") == path]
    if len(rows) != 1 or rows[0].get("kind") != "regular" or (rows[0].get("bytes"), rows[0].get("sha256"), rows[0].get("uid")) != (identity["libseccomp_bytes"], identity["libseccomp_sha256"], 0) or rows[0].get("mode", 0) & 0o222:
        fail("target view does not independently map the authenticated libseccomp object")
    parent_fd, leaf = _open_runtime_parent(path)
    if leaf is None:
        os.close(parent_fd)
        fail("libseccomp handoff path cannot be the runtime root")
    try:
        fd = os.open(leaf, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
    finally:
        os.close(parent_fd)
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_uid != 0 or before.st_mode & 0o022 or before.st_size != identity["libseccomp_bytes"] or (stat.S_IMODE(before.st_mode), before.st_uid, before.st_gid) != (rows[0]["mode"], rows[0]["uid"], rows[0]["gid"]):
            fail("libseccomp handoff source is not the mapped protected regular file")
        digest = hashlib.sha256()
        offset = 0
        while offset < before.st_size:
            block = os.pread(fd, min(CHUNK, before.st_size - offset), offset)
            if not block:
                fail("libseccomp handoff source ended before its authenticated size")
            digest.update(block)
            offset += len(block)
        after = os.fstat(fd)
        header = os.pread(fd, 20, 0)
        if (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) or digest.hexdigest() != identity["libseccomp_sha256"] or len(header) != 20 or header[:6] != b"\x7fELF\x02\x01" or int.from_bytes(header[18:20], "little") != 183:
            fail("libseccomp handoff object differs from the authenticated AArch64 runtime identity")
        high_fd = fcntl.fcntl(fd, fcntl.F_DUPFD_CLOEXEC, 10)
    except BaseException:
        os.close(fd)
        raise
    os.close(fd)
    return high_fd

def build_target_view(proof_root: Path, run_id: str, target_view: dict[str, Any], loader_source_path: str) -> Path:
    view = proof_root / "runtime-view"
    os.mkdir(view, 0o755)
    os.chown(view, 0, 0)
    os.chmod(view, 0o755)
    entries = target_view["entries"]
    directories = [row for row in entries if row["kind"] == "directory"]
    for row in sorted(directories, key=lambda item: (len(PurePath(item["path"]).parts), item["path"])):
        if row["path"] not in TARGET_VIEW_FIXED_PATHS:
            _verify_view_source_directory(row)
        if row["path"] == "/":
            if (row["uid"], row["gid"]) != (0, 0) or row["mode"] & 0o222 or row["mode"] & 0o555 != 0o555:
                fail("runtime view root must be root-owned and non-writable with traversal rights")
            os.chmod(view, row["mode"])
            continue
        path = _view_target(view, row["path"])
        os.mkdir(path, row["mode"])
        os.chown(path, row["uid"], row["gid"])
        os.chmod(path, row["mode"])
    for row in entries:
        path = _view_target(view, row["path"])
        if row["kind"] == "regular":
            if row["path"] == loader_source_path:
                continue
            fd, _digest = _read_view_source(row)
            try:
                placeholder = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o000)
                os.close(placeholder)
                mount_call(os.fsencode(f"/proc/self/fd/{fd}"), os.fsencode(path), None, VIEW_BIND)
                noexec = 0 if row["mode"] & 0o111 else VIEW_NOEXEC
                mount_call(None, os.fsencode(path), None, VIEW_BIND | VIEW_REMOUNT | VIEW_RDONLY | VIEW_NOSUID | VIEW_NODEV | noexec)
                source_info = os.fstat(fd)
                target_info = path.stat(follow_symlinks=False)
                if (source_info.st_dev, source_info.st_ino, source_info.st_size, source_info.st_mode, source_info.st_uid, source_info.st_gid) != (target_info.st_dev, target_info.st_ino, target_info.st_size, target_info.st_mode, target_info.st_uid, target_info.st_gid):
                    fail(f"target-view mounted file identity changed: {row['path']}")
            finally:
                os.close(fd)
        elif row["kind"] == "symlink":
            _verify_view_source_symlink(row)
            os.symlink(row["target"], path)
        elif row["kind"] == "dynamic" and row["path"] not in {"/proc/self", "/proc/self/status", "/proc/self/cgroup", "/proc/self/fd", "/proc/self/fd/3"}:
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o000)
            os.close(fd)
    for required in ("/proof/out", "/proof/home", "/proof/tmp", "/proof/scratch", "/proof/reserved-mapping", "/proof/cgroup-diagnostics"):
        target = _view_target(view, required)
        if not target.is_dir() or target.is_symlink():
            fail(f"target-view omits required writable or diagnostic directory: {required}")
    output = _view_target(view, f"/proof/out/{run_id}")
    os.mkdir(output, 0o700)
    os.chown(output, UID, GID)
    os.chmod(output, 0o700)
    return view


def install_target_view_dynamic(view: Path, proof_root: Path, child_pid: int, run_id: str, libseccomp_fd: int) -> None:
    proc = _view_target(view, "/proc")
    pid_dir = proc / str(child_pid)
    os.mkdir(pid_dir, 0o555)
    os.symlink(str(child_pid), proc / "self")
    for name in ("status", "cgroup"):
        placeholder = pid_dir / name
        fd = os.open(placeholder, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o000)
        os.close(fd)
        mount_call(os.fsencode(f"/proc/{child_pid}/{name}"), os.fsencode(placeholder), None, VIEW_BIND)
        mount_call(None, os.fsencode(placeholder), None, VIEW_BIND | VIEW_REMOUNT | VIEW_RDONLY | VIEW_NOSUID | VIEW_NODEV | VIEW_NOEXEC)
    fd_dir = pid_dir / "fd"
    os.mkdir(fd_dir, 0o555)
    loader_target = fd_dir / "3"
    fd = os.open(loader_target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o000)
    os.close(fd)
    loader_source = Path(f"/proc/{child_pid}/fd/3")
    held = os.fstat(libseccomp_fd)
    source_info = loader_source.stat()
    if not stat.S_ISREG(held.st_mode) or (source_info.st_dev, source_info.st_ino, source_info.st_size, source_info.st_mode, source_info.st_uid, source_info.st_gid) != (held.st_dev, held.st_ino, held.st_size, held.st_mode, held.st_uid, held.st_gid):
        fail("child loader descriptor does not retain the authenticated libseccomp object")
    mount_call(os.fsencode(loader_source), os.fsencode(loader_target), None, VIEW_BIND)
    mount_call(None, os.fsencode(loader_target), None, VIEW_BIND | VIEW_REMOUNT | VIEW_RDONLY | VIEW_NOSUID | VIEW_NODEV)
    cap_source = Path("/proc/sys/kernel/cap_last_cap")
    cap_target = _view_target(view, "/proc/sys/kernel/cap_last_cap")
    cap_info = cap_target.lstat()
    if cap_source.is_symlink() or not cap_source.is_file() or not stat.S_ISREG(cap_info.st_mode) or stat.S_ISLNK(cap_info.st_mode):
        fail("bounded kernel capability-range input is not a mapped regular file")
    mount_call(os.fsencode(cap_source), os.fsencode(cap_target), None, VIEW_BIND)
    mount_call(None, os.fsencode(cap_target), None, VIEW_BIND | VIEW_REMOUNT | VIEW_RDONLY | VIEW_NOSUID | VIEW_NODEV | VIEW_NOEXEC)
    diagnostics = proof_root / "cgroup-diagnostics"
    for name in ("pids.events", "pids.max"):
        source = diagnostics / name
        target = _view_target(view, f"/proof/cgroup-diagnostics/{name}")
        target_info = target.lstat()
        if source.is_symlink() or not source.is_file() or not stat.S_ISREG(target_info.st_mode) or stat.S_ISLNK(target_info.st_mode):
            fail(f"cgroup diagnostic projection path is unsafe: {name}")
        mount_call(os.fsencode(source), os.fsencode(target), None, VIEW_BIND)
        mount_call(None, os.fsencode(target), None, VIEW_BIND | VIEW_REMOUNT | VIEW_RDONLY | VIEW_NOSUID | VIEW_NODEV | VIEW_NOEXEC)
    for source, target in (
        (proof_root / "out" / run_id, _view_target(view, f"/proof/out/{run_id}")),
        (proof_root / "home", _view_target(view, "/proof/home")),
        (proof_root / "tmp", _view_target(view, "/proof/tmp")),
        (proof_root / "scratch", _view_target(view, "/proof/scratch")),
        (proof_root / "reserved-mapping", _view_target(view, "/proof/reserved-mapping")),
    ):
        mount_call(os.fsencode(source), os.fsencode(target), None, VIEW_BIND)

def verify_target_view_mounts(view: Path, proof_root: Path, target_view: dict[str, Any], child_pid: int, run_id: str, libseccomp_fd: int, loader_source_path: str) -> None:
    required_readonly = (VIEW_RDONLY, VIEW_NOSUID, VIEW_NODEV)

    def check_readonly(path: Path, executable: bool) -> None:
        flags = os.statvfs(path).f_flag
        if any(not flags & flag for flag in required_readonly) or bool(flags & VIEW_NOEXEC) == executable:
            fail(f"target-view read-only mount flags are incomplete: {path}")

    for row in target_view["entries"]:
        if row["kind"] == "regular":
            if row["path"] == loader_source_path:
                path = _view_target(view, row["path"])
                if path.exists() or path.is_symlink():
                    fail("authenticated loader source path must not be exposed inside the target view")
                continue
            path = _view_target(view, row["path"])
            target_info = path.stat()
            if not stat.S_ISREG(target_info.st_mode) or (target_info.st_size, stat.S_IMODE(target_info.st_mode), target_info.st_uid, target_info.st_gid) != (row["bytes"], row["mode"], row["uid"], row["gid"]):
                fail(f"target-view mounted file differs from its approved metadata: {row['path']}")
            check_readonly(path, bool(row["mode"] & 0o111))
        elif row["kind"] == "dynamic":
            if row["path"] == "/proc/self":
                self_link = _view_target(view, "/proc/self")
                if not self_link.is_symlink() or os.readlink(self_link) != str(child_pid):
                    fail("target-view self link does not name the actual waiting child")
            elif row["path"] == "/proc/self/fd":
                fd_dir = _view_target(view, row["path"])
                info = fd_dir.stat()
                if not stat.S_ISDIR(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) != 0o555 or os.listdir(fd_dir) != ["3"]:
                    fail("target-view loader descriptor directory is not the fixed single-entry view")
            elif row["path"] == "/proc/self/fd/3":
                source = Path(f"/proc/{child_pid}/fd/3").stat()
                target = _view_target(view, row["path"])
                target_info = target.stat()
                held = os.fstat(libseccomp_fd)
                identity = (held.st_dev, held.st_ino, held.st_size, held.st_mode, held.st_uid, held.st_gid)
                if (source.st_dev, source.st_ino, source.st_size, source.st_mode, source.st_uid, source.st_gid) != identity or (target_info.st_dev, target_info.st_ino, target_info.st_size, target_info.st_mode, target_info.st_uid, target_info.st_gid) != identity:
                    fail("target-view loader projection differs from the inherited authenticated descriptor")
                check_readonly(target, True)
            elif row["path"] in {"/proc/self/status", "/proc/self/cgroup", "/proc/sys/kernel/cap_last_cap", "/proof/cgroup-diagnostics/pids.events", "/proof/cgroup-diagnostics/pids.max"}:
                source = Path(f"/proc/{child_pid}/status") if row["path"] == "/proc/self/status" else Path(f"/proc/{child_pid}/cgroup") if row["path"] == "/proc/self/cgroup" else Path("/proc/sys/kernel/cap_last_cap") if row["path"] == "/proc/sys/kernel/cap_last_cap" else proof_root / "cgroup-diagnostics" / PurePath(row["path"]).name
                target = _view_target(view, row["path"])
                source_info = source.stat()
                target_info = target.stat()
                if (source_info.st_dev, source_info.st_ino, source_info.st_mode) != (target_info.st_dev, target_info.st_ino, target_info.st_mode):
                    fail(f"target-view dynamic file differs from its typed source: {row['path']}")
                check_readonly(target, False)
    for name in ("out", "home", "tmp", "scratch", "reserved-mapping"):
        source = proof_root / "out" / run_id if name == "out" else proof_root / name
        guest_path = f"/proof/out/{run_id}" if name == "out" else f"/proof/{name}"
        target = _view_target(view, guest_path)
        source_info = source.stat()
        target_info = target.stat()
        flags = os.statvfs(target).f_flag
        if (source_info.st_dev, source_info.st_ino, source_info.st_uid, source_info.st_gid, stat.S_IMODE(source_info.st_mode)) != (target_info.st_dev, target_info.st_ino, target_info.st_uid, target_info.st_gid, stat.S_IMODE(target_info.st_mode)) or source_info.st_dev != os.stat(proof_root).st_dev or flags & VIEW_RDONLY or any(not flags & flag for flag in (VIEW_NOSUID, VIEW_NODEV, VIEW_NOEXEC)):
            fail(f"target-view writable alias escaped the bounded proof filesystem: {guest_path}")
    allowed_rw = {"/proof", "/tmp", "/var/tmp", "/home", "/dev/shm", "/run"}
    allowed_rw.update(str(_view_target(view, f"/proof/out/{run_id}" if name == "out" else f"/proof/{name}")) for name in ("out", "home", "tmp", "scratch", "reserved-mapping"))
    proof_device = os.stat(proof_root).st_dev
    mountinfo = Path("/proc/self/mountinfo").read_text(encoding="ascii")
    for line in mountinfo.splitlines():
        pre, separator, post = line.partition(" - ")
        fields = pre.split()
        post_fields = post.split()
        if not separator or len(fields) < 6 or len(post_fields) < 3:
            fail("malformed mountinfo during final target-view writable audit")
        mountpoint = fields[4].replace("\\040", " ")
        options = set(fields[5].split(","))
        if "rw" in options and (mountpoint not in allowed_rw or post_fields[0] != "ext4" or os.stat(mountpoint).st_dev != proof_device):
            fail(f"unaccounted writable mount remains before target release: {mountpoint}")




def frame_bytes(run_id: str, sequence: int, channel: str, payload: bytes) -> bytes:
    header = canonical({"channel": channel, "length": len(payload), "run_id": run_id, "sequence": sequence, "sha256": sha256(payload)})
    if len(header) > 4096 or len(payload) > MAX_RECORD:
        fail("outgoing evidence frame exceeds bounds")
    return b"QF5OFFLINE\x01" + len(header).to_bytes(4, "big") + header + payload


SERIAL_SEND_CHUNK = 64 * 1024
SERIAL_SEND_MAX_STEPS = 4096


@dataclass(frozen=True, slots=True)
class SerialSendOutcome:
    status: Literal["complete", "partial", "unknown"]
    started: bool
    sequence: int
    frame_bytes: int
    bytes_written: int
    reason: str | None = None

    @property
    def complete(self) -> bool:
        return self.status == "complete"

    def as_dict(self) -> dict[str, Any]:
        return {
            "status": self.status,
            "started": self.started,
            "sequence": self.sequence,
            "frame_bytes": self.frame_bytes,
            "bytes_written": self.bytes_written,
            "receiver_observed": "unknown",
            "reason": self.reason,
        }


class SerialWriter:
    def __init__(self) -> None:
        fd = os.open(SERIAL, os.O_WRONLY | os.O_NONBLOCK | getattr(os, "O_NOFOLLOW", 0))
        try:
            info = os.fstat(fd)
            if not stat.S_ISCHR(info.st_mode):
                fail("virtio serial endpoint is not a character device")
            poller = select.poll()
            poller.register(fd, select.POLLOUT | select.POLLERR | select.POLLHUP)
        except BaseException:
            os.close(fd)
            raise
        self.fd = fd
        self.poller = poller
        self.sequence = 0
        self.total = 0
        self.poisoned = False

    def not_started(self, reason: str) -> SerialSendOutcome:
        status = "unknown" if self.poisoned else "partial"
        return SerialSendOutcome(status, False, self.sequence, 0, 0, reason)

    def _send_frame(self, run_id: str, channel: str, payload: bytes, deadline: float, *, corrupt: bool = False) -> SerialSendOutcome:
        if self.poisoned:
            return self.not_started("writer-poisoned")
        if time.monotonic() >= deadline:
            return self.not_started("deadline-before-send")
        sequence = self.sequence
        frame = bytearray(frame_bytes(run_id, sequence, channel, payload)) if corrupt else frame_bytes(run_id, sequence, channel, payload)
        if corrupt:
            if not payload:
                fail("cannot construct a meaningful transport-corruption case")
            frame[-1] ^= 1
        if self.total + len(payload) > MAX_RECORD:
            fail("trusted transport budget exceeded")
        self.total += len(payload)
        view = memoryview(frame)
        bytes_written = 0
        steps = 0
        started = False

        def incomplete(status: str, reason: str) -> SerialSendOutcome:
            if bytes_written or status == "unknown":
                self.poisoned = True
            return SerialSendOutcome(status, started, sequence, len(frame), bytes_written, reason)

        while view:
            if time.monotonic() >= deadline:
                return incomplete("partial", "deadline")
            if steps >= SERIAL_SEND_MAX_STEPS:
                return incomplete("partial" if bytes_written else "unknown", "progress-step-limit")
            started = True
            steps += 1
            try:
                count = os.write(self.fd, view[:SERIAL_SEND_CHUNK])
            except InterruptedError:
                continue
            except BlockingIOError:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    return incomplete("partial", "deadline")
                if steps >= SERIAL_SEND_MAX_STEPS:
                    return incomplete("partial" if bytes_written else "unknown", "progress-step-limit")
                steps += 1
                try:
                    events = self.poller.poll(max(1, math.ceil(remaining * 1000)))
                except OSError as exc:
                    return incomplete("unknown", f"poll:{type(exc).__name__}")
                if time.monotonic() >= deadline:
                    return incomplete("partial", "deadline")
                if any(mask & (select.POLLERR | select.POLLHUP | select.POLLNVAL) for _fd, mask in events):
                    return incomplete("unknown", "serial-fd-not-writable")
                continue
            except OSError as exc:
                return incomplete("unknown", f"write:{type(exc).__name__}")
            if count <= 0 or count > len(view):
                return incomplete("unknown", "invalid-write-count")
            bytes_written += count
            view = view[count:]
        self.sequence += 1
        if corrupt:
            self.poisoned = True
        return SerialSendOutcome("complete", True, sequence, len(frame), bytes_written)

    def send(self, run_id: str, channel: str, payload: bytes, *, deadline: float) -> SerialSendOutcome:
        return self._send_frame(run_id, channel, payload, deadline)

    def send_corrupt(self, run_id: str, channel: str, payload: bytes, *, deadline: float) -> SerialSendOutcome:
        return self._send_frame(run_id, channel, payload, deadline, corrupt=True)

    def close(self) -> None:
        os.close(self.fd)


def send_json(writer: SerialWriter, run_id: str, channel: str, value: dict[str, Any], *, deadline: float) -> SerialSendOutcome:
    if writer.poisoned:
        return writer.not_started("writer-poisoned")
    if time.monotonic() >= deadline:
        return writer.not_started("deadline-before-send")
    return writer.send(run_id, channel, canonical(value), deadline=deadline)


def require_serial_complete(outcome: SerialSendOutcome, purpose: str) -> None:
    if not outcome.complete:
        raise GuestError(f"{purpose} serial frame {outcome.status}: {outcome.reason}")


def parse_cmdline() -> dict[str, str]:
    allowed = {"offlineproof.mode", "offlineproof.runid", "offlineproof.case", "offlineproof.manifest", "offlineproof.runtime_identity", "offlineproof.budget_ms", "offlineproof.source_runid", "offlineproof.image_sha256", "offlineproof.target_view_sha256", "offlineproof.prepared_image_sha256", "offlineproof.prepared_image_bytes", "offlineproof.prepared_root_partition_bytes", "offlineproof.prepared_root_partition_sha256", "offlineproof.preparation_claim_sha256", "offlineproof.target_view_start"}
    result: dict[str, str] = {}
    for token in Path("/proc/cmdline").read_text(encoding="ascii").split():
        if "=" not in token:
            continue
        key, value = token.split("=", 1)
        if key.startswith("offlineproof."):
            if key not in allowed or key in result or not value:
                fail("unknown, duplicate or empty offlineproof kernel argument")
            result[key] = value
    required = {"offlineproof.mode", "offlineproof.runid", "offlineproof.case", "offlineproof.manifest", "offlineproof.runtime_identity", "offlineproof.budget_ms"}
    mode = result.get("offlineproof.mode")
    if mode == "inspection":
        required |= {"offlineproof.source_runid", "offlineproof.image_sha256"}
        cases = {"I1-read-only-integrity", "I2-replay-free-evidence"}
    elif mode == "fixture":
        required |= {"offlineproof.target_view_sha256", "offlineproof.prepared_image_sha256", "offlineproof.prepared_image_bytes", "offlineproof.prepared_root_partition_bytes", "offlineproof.prepared_root_partition_sha256", "offlineproof.preparation_claim_sha256", "offlineproof.target_view_start"}
        cases = {"H1-positive-isolation", "H2-aggregate-storage", "H3-stdout-overflow", "H4-stderr-overflow", "H5-deadline", "H6-host-interruption", "H7-guest-transport-failure", "H8-one-shot-replay"}
    else:
        fail("kernel mode is not an allowlisted fixture or read-only inspection")
    if set(result) != required:
        fail("offlineproof kernel arguments incomplete or contain extra fields")
    uuid_pattern = r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}"
    if not re.fullmatch(uuid_pattern, result["offlineproof.runid"]):
        fail("run ID argument is not a canonical UUID")
    if mode == "inspection" and not re.fullmatch(uuid_pattern, result["offlineproof.source_runid"]):
        fail("inspection source run ID is not a canonical UUID")
    if result["offlineproof.case"] not in cases:
        fail("fixture/inspection ID is not allowlisted")
    if not re.fullmatch(r"[0-9a-f]{64}", result["offlineproof.manifest"]):
        fail("manifest digest argument malformed")
    if not re.fullmatch(r"[0-9a-f]{64}", result["offlineproof.runtime_identity"]):
        fail("runtime identity digest binding malformed")
    if mode == "inspection" and not re.fullmatch(r"[0-9a-f]{64}", result["offlineproof.image_sha256"]):
        fail("inspection source-image digest malformed")
    if mode == "fixture" and not re.fullmatch(r"[0-9a-f]{64}", result["offlineproof.target_view_sha256"]):
        fail("independent target-view digest binding malformed")
    if mode == "fixture" and any(not re.fullmatch(r"[0-9a-f]{64}", result[key]) for key in ("offlineproof.prepared_image_sha256", "offlineproof.prepared_root_partition_sha256", "offlineproof.preparation_claim_sha256")):
        fail("fixture prepared-runtime lineage digest malformed")
    if mode == "fixture":
        image_bytes = result["offlineproof.prepared_image_bytes"]
        root_bytes = result["offlineproof.prepared_root_partition_bytes"]
        target_start = result["offlineproof.target_view_start"]
        if (
            not image_bytes.isdigit()
            or not root_bytes.isdigit()
            or not 512 <= int(image_bytes) <= 8 * 1024 * 1024 * 1024
            or int(image_bytes) % 512
            or not 512 <= int(root_bytes) <= int(image_bytes)
            or int(root_bytes) % 512
            or not target_start.isdigit()
        ):
            fail("single-device runtime partition geometry arguments are malformed")
        expected_start = ((2048 + int(root_bytes) // 512 + 2047) // 2048) * 2048
        if int(target_start) != expected_start:
            fail("target-view partition start differs from the fixed aligned composite layout")
    if not result["offlineproof.budget_ms"].isdigit() or not 1 <= int(result["offlineproof.budget_ms"]) <= 300_000:
        fail("remaining guest budget invalid")
    return result


def mount_call(source: bytes | None, target: bytes, fstype: bytes | None, flags: int, data: bytes | None = None) -> None:
    libc = ctypes.CDLL("/lib/aarch64-linux-gnu/libc.so.6", use_errno=True)
    libc.mount.argtypes = [ctypes.c_char_p, ctypes.c_char_p, ctypes.c_char_p, ctypes.c_ulong, ctypes.c_char_p]
    libc.mount.restype = ctypes.c_int
    if libc.mount(source, target, fstype, flags, data) != 0:
        err = ctypes.get_errno()
        raise GuestError(f"mount failed for {target.decode()}: errno {err}")


def enter_mount_namespace() -> None:
    libc = ctypes.CDLL("/lib/aarch64-linux-gnu/libc.so.6", use_errno=True)
    libc.unshare.argtypes = [ctypes.c_int]
    libc.unshare.restype = ctypes.c_int
    CLONE_NEWNS = 0x00020000
    if libc.unshare(CLONE_NEWNS) != 0:
        fail(f"cannot create mount namespace: errno {ctypes.get_errno()}")
    MS_REC = 16384
    MS_PRIVATE = 1 << 18
    mount_call(None, b"/", None, MS_REC | MS_PRIVATE)


def root_mount_source() -> tuple[str, str]:
    for line in Path("/proc/self/mountinfo").read_text(encoding="ascii").splitlines():
        pre, separator, post = line.partition(" - ")
        fields = pre.split()
        mounted = fields[4].replace("\\040", " ") if len(fields) > 4 else ""
        if separator and mounted == "/":
            values = post.split()
            if len(values) < 3 or values[0] != "ext4":
                fail("root mount is not an ext4 filesystem")
            source = values[1]
            if not source.startswith("/dev/") or any(character.isspace() for character in source):
                fail("root mount source is not a concrete block-device path")
            return source, ",".join(fields[5].split(","))
    fail("root mount is absent from mountinfo")


def verify_runtime_root(expected_readonly: bool, *, runtime_partitioned: bool = False) -> None:
    source, _options = root_mount_source()
    root_device = Path(source)
    if root_device.is_symlink() or not stat.S_ISBLK(root_device.lstat().st_mode):
        fail("root filesystem is not mounted from a direct block-device node")
    if not source.startswith("/dev/sda"):
        fail("runtime root is not the sealed USB runtime device")
    if runtime_partitioned and source != "/dev/sda1":
        fail("fixture root must be the first ext4 partition in the single sealed USB input")
    usb_ro = Path("/sys/block/sda/ro").read_text(encoding="ascii").strip()
    if usb_ro != ("1" if expected_readonly else "0"):
        fail("runtime USB block-device readonly state differs from required phase")
    cmdline = Path("/proc/cmdline").read_text(encoding="ascii").split()
    root_args = [token for token in cmdline if token.startswith("root=UUID=")]
    if len(root_args) != 1:
        fail("kernel root UUID argument is missing or ambiguous")
    actual_uuid = subprocess.run(["/sbin/blkid", "-p", "-s", "UUID", "-o", "value", str(root_device)], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=False, text=True, encoding="ascii")
    if actual_uuid.returncode != 0 or actual_uuid.stdout.strip() != root_args[0][len("root=UUID="):]:
        fail("mounted runtime root UUID differs from the fixed boot argument")


def mounted_root_uuid(expected_device: str) -> str:
    source, options = root_mount_source()
    if source != expected_device or "rw" not in options.split(","):
        fail("preparation root mount source or writable state differs from the acquired image")
    device = Path(source)
    if device.is_symlink() or not stat.S_ISBLK(device.lstat().st_mode):
        fail("preparation root is not a direct block device")
    result = subprocess.run(["/sbin/blkid", "-p", "-s", "UUID", "-o", "value", str(device)], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=False, text=True, encoding="ascii")
    value = result.stdout.strip()
    if result.returncode != 0 or not re.fullmatch(r"[0-9a-fA-F-]{36}", value):
        fail("preparation root filesystem UUID cannot be established from the mounted root")
    return value


def mount_proof_device(run_id: str) -> Path:
    mountpoint = Path("/proof")
    if not mountpoint.is_dir() or mountpoint.is_symlink() or any(mountpoint.iterdir()):
        fail("prepared /proof mountpoint is missing, unsafe or nonempty")
    device = Path("/dev/vda")
    if not device.exists() or device.is_symlink() or not stat.S_ISBLK(device.lstat().st_mode):
        fail("exactly one expected virtio writable block device /dev/vda is required")
    sys_block = Path("/sys/block/vda")
    if (sys_block / "ro").read_text(encoding="ascii").strip() != "0" or (sys_block / "size").read_text(encoding="ascii").strip() != "8388608":
        fail("fresh proof block device is not writable fixed 4 GiB")
    result = subprocess.run(["/sbin/blkid", "-p", str(device)], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=False)
    if result.returncode == 0:
        fail("writable proof device is not blank; refusing adoption/replay")
    if result.returncode != 2:
        fail("cannot establish a uniquely blank writable proof device")
    mkfs = subprocess.run(["/sbin/mkfs.ext4", "-F", "-q", "-L", f"proof-{run_id[:16]}", str(device)], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120, check=False)
    if mkfs.returncode != 0:
        fail("fresh proof filesystem formatting failed")
    MS_NOSUID = 2
    MS_NODEV = 4
    MS_NOEXEC = 8
    mount_call(os.fsencode(device), os.fsencode(mountpoint), b"ext4", MS_NOSUID | MS_NODEV | MS_NOEXEC)
    mountinfo = Path("/proc/self/mountinfo").read_text(encoding="ascii")
    proof_mounts = []
    for line in mountinfo.splitlines():
        pre, separator, post = line.partition(" - ")
        fields = pre.split()
        post_fields = post.split()
        if not separator or len(fields) < 6:
            fail("malformed mountinfo while verifying the freshly mounted proof device")
        if fields[4].replace("\\040", " ") == str(mountpoint):
            if len(post_fields) < 3 or post_fields[0] != "ext4" or post_fields[1] != str(device) or not {"rw", "nosuid", "nodev", "noexec"}.issubset(fields[5].split(",")):
                fail("fresh proof device mount source, filesystem or security options differ")
            proof_mounts.append(line)
    device_info = device.lstat()
    proof_info = mountpoint.stat()
    if len(proof_mounts) != 1 or (os.major(proof_info.st_dev), os.minor(proof_info.st_dev)) != (os.major(device_info.st_rdev), os.minor(device_info.st_rdev)):
        fail("fresh proof device is not uniquely mounted on the exact /proof filesystem")
    os.chown(mountpoint, 0, 0)
    os.chmod(mountpoint, 0o711)
    for name in ("out", "scratch", "home", "tmp", "reserved-mapping"):
        path = mountpoint / name
        path.mkdir(mode=0o700, exist_ok=False)
        os.chown(path, UID, GID)
    (mountpoint / "evidence").mkdir(mode=0o700, exist_ok=False)
    diagnostics = mountpoint / "cgroup-diagnostics"
    diagnostics.mkdir(mode=0o555, exist_ok=False)
    for name in ("pids.events", "pids.max"):
        fd = os.open(diagnostics / name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o400)
        os.close(fd)
    aliases = ((b"/proof/tmp", b"/tmp"), (b"/proof/tmp", b"/var/tmp"), (b"/proof/home", b"/home"), (b"/proof/tmp", b"/dev/shm"), (b"/proof/scratch", b"/run"))
    for _source, target in aliases:
        path = Path(os.fsdecode(target))
        if not path.is_dir() or path.is_symlink():
            fail(f"fixed writable alias target is missing or unsafe: {path}")
    for source, target in aliases:
        mount_call(source, target, None, 4096)
    return mountpoint


def verify_mount_topology() -> None:
    verify_runtime_root(expected_readonly=True)
    mountinfo = Path("/proc/self/mountinfo").read_text(encoding="ascii")
    proof_mounts = []
    allowed_rw = {"/proof", "/tmp", "/var/tmp", "/home", "/dev/shm", "/run"}
    proof_device = os.stat("/proof").st_dev
    for line in mountinfo.splitlines():
        pre, separator, post = line.partition(" - ")
        fields = pre.split()
        if not separator or len(fields) < 6:
            fail("malformed mountinfo while verifying writable containment")
        mountpoint_value = fields[4].replace("\\040", " ")
        options = set(fields[5].split(","))
        fstype = post.split()[0] if post.split() else ""
        if mountpoint_value == "/":
            if "ro" not in options or fstype != "ext4":
                fail("runtime root is not a read-only ext4 block mount")
        if mountpoint_value == "/proof":
            if not {"rw", "nosuid", "nodev", "noexec"}.issubset(options) or fstype != "ext4":
                fail("proof filesystem lacks writable bounded nodev/nosuid/noexec ext4 mount policy")
            proof_mounts.append(line)
        if "rw" in options:
            if mountpoint_value not in allowed_rw or fstype != "ext4":
                fail(f"unaccounted writable mount: {mountpoint_value} ({fstype})")
            if os.stat(mountpoint_value).st_dev != proof_device:
                fail(f"writable mount is not on the single proof filesystem: {mountpoint_value}")
    if len(proof_mounts) != 1:
        fail("proof ext4 mount is not unique")

def mount_readonly_cgroup_and_create_domain() -> tuple[Path, int, int]:
    cgroup_root = Path("/sys/fs/cgroup")
    if not (cgroup_root / "cgroup.controllers").is_file():
        fail("cgroup v2 is unavailable")
    if "pids" not in (cgroup_root / "cgroup.controllers").read_text(encoding="ascii").split():
        fail("cgroup v2 pids controller unavailable")
    enabled = (cgroup_root / "cgroup.subtree_control").read_text(encoding="ascii").split()
    if "pids" not in enabled:
        fd = os.open(cgroup_root / "cgroup.subtree_control", os.O_WRONLY | getattr(os, "O_NOFOLLOW", 0))
        try:
            write_all(fd, b"+pids\n")
        finally:
            os.close(fd)
    group = cgroup_root / f"offline-proof-{os.getpid()}"
    group.mkdir(mode=0o700, exist_ok=False)
    (group / "pids.max").write_text("3\n", encoding="ascii")
    if (group / "pids.max").read_text(encoding="ascii").strip() != "3":
        fail("kernel did not enforce pids.max=3")
    kill_fd = os.open(group / "cgroup.kill", os.O_WRONLY | getattr(os, "O_NOFOLLOW", 0))
    procs_fd = os.open(group / "cgroup.procs", os.O_WRONLY | getattr(os, "O_NOFOLLOW", 0))
    diagnostics = Path("/proof/cgroup-diagnostics")
    for name in ("pids.events", "pids.max"):
        target = diagnostics / name
        mount_call(os.fsencode(group / name), os.fsencode(target), None, 4096)
        mount_call(None, os.fsencode(target), None, 4096 | 32 | 1)
        info = target.stat()
        if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or stat.S_IMODE(info.st_mode) & 0o022:
            fail("cgroup diagnostic bind is not a protected regular read-only view")
    mount_call(None, os.fsencode(cgroup_root), None, 32 | 1)
    for mountpoint_bytes in (b"/proc", b"/sys", b"/dev"):
        mount_call(None, mountpoint_bytes, None, 32 | 1)
    verify_mount_topology()
    return group, kill_fd, procs_fd


def write_all(fd: int, payload: bytes) -> None:
    view = memoryview(payload)
    while view:
        count = os.write(fd, view)
        if count <= 0:
            fail("short evidence write")
        view = view[count:]


def terminate_cgroup(kill_fd: int) -> None:
    os.lseek(kill_fd, 0, os.SEEK_SET)
    write_all(kill_fd, b"1\n")


def prepare_run_output(proof_root: Path, run_id: str) -> None:
    if not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", run_id):
        fail("run output identifier is not a canonical UUID")
    proof_info = os.stat(proof_root, follow_symlinks=False)
    parent_fd = os.open(proof_root / "out", os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0))
    try:
        parent_info = os.fstat(parent_fd)
        if not stat.S_ISDIR(parent_info.st_mode) or parent_info.st_uid != UID or parent_info.st_gid != GID or stat.S_IMODE(parent_info.st_mode) != 0o700 or parent_info.st_dev != proof_info.st_dev:
            fail("output parent is not the target-owned directory on the proof filesystem")
        os.mkdir(run_id, mode=0o700, dir_fd=parent_fd)
        run_fd = os.open(run_id, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        try:
            created = os.fstat(run_fd)
            if not stat.S_ISDIR(created.st_mode) or created.st_uid != 0 or created.st_dev != parent_info.st_dev:
                fail("exclusive run directory identity is unsafe before ownership transfer")
            os.fchown(run_fd, UID, GID)
            os.fchmod(run_fd, 0o700)
            os.fsync(run_fd)
            final = os.fstat(run_fd)
            if final.st_uid != UID or final.st_gid != GID or stat.S_IMODE(final.st_mode) != 0o700 or final.st_dev != parent_info.st_dev:
                fail("run directory ownership differs from the target contract")
        finally:
            os.close(run_fd)
        os.fsync(parent_fd)
    finally:
        os.close(parent_fd)


def reserve_stream_files(proof_root: Path) -> dict[str, int]:
    evidence_fd = os.open(proof_root / "evidence", os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0))
    descriptors: dict[str, int] = {}
    try:
        directory = os.fstat(evidence_fd)
        if not stat.S_ISDIR(directory.st_mode) or directory.st_uid != 0 or stat.S_IMODE(directory.st_mode) != 0o700:
            fail("stream evidence directory must be a root-owned 0700 directory")
        libc = ctypes.CDLL("/lib/aarch64-linux-gnu/libc.so.6", use_errno=True)
        libc.fallocate.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_longlong, ctypes.c_longlong]
        libc.fallocate.restype = ctypes.c_int
        for name in ("stdout", "stderr"):
            fd = os.open(f"{name}.bin", os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600, dir_fd=evidence_fd)
            descriptors[name] = fd
            info = os.fstat(fd)
            if not stat.S_ISREG(info.st_mode) or info.st_uid != 0 or info.st_nlink != 1 or info.st_size != 0:
                fail(f"reserved {name} evidence file identity is unsafe")
            if libc.fallocate(fd, 1, 0, MAX_STREAM) != 0:
                fail(f"cannot reserve the full {name} prefix on the fixed evidence filesystem: errno {ctypes.get_errno()}")
        os.fsync(evidence_fd)
        return descriptors
    except BaseException:
        for fd in descriptors.values():
            os.close(fd)
        raise
    finally:
        os.close(evidence_fd)


def enumerate_owned_direct_task_ids(child_pid: int) -> list[int]:
    if child_pid <= 0:
        fail("owned proof child PID is invalid")
    task_path = f"/proc/{child_pid}/task"
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0) | getattr(os, "O_CLOEXEC", 0)
    try:
        task_fd = os.open(task_path, flags)
    except OSError as exc:
        raise GuestError("owned proof task list is unavailable") from exc
    try:
        names = os.listdir(task_fd)
        if not 1 <= len(names) <= 3 or any(not name.isascii() or not name.isdecimal() or name.startswith("0") for name in names):
            fail("owned proof task list is outside its fixed bounds")
        tids = sorted(int(name) for name in names)
        if len(tids) != len(set(tids)) or any(tid <= 0 for tid in tids):
            fail("owned proof task list contains an invalid TID")
        for name in names:
            info = os.stat(name, dir_fd=task_fd, follow_symlinks=False)
            if not stat.S_ISDIR(info.st_mode):
                fail("owned proof task list contains a non-directory entry")
        if sorted(os.listdir(task_fd)) != sorted(names):
            fail("owned proof task list changed during bounded enumeration")
        return tids
    finally:
        os.close(task_fd)

def task_list_response(peer: socket.socket, child_pid: int, request_count: int) -> tuple[int, str | None, bool]:
    request_limit = TARGET_VIEW_INTERFACES[0]["maximum_request_bytes"]
    request = peer.recv(request_limit + 1)
    request_count += 1
    if not request:
        return request_count, None, True
    error = None
    tids: list[int] = []
    if request_count > TARGET_VIEW_INTERFACES[0]["maximum_requests"] or len(request) > request_limit:
        error = "task-list request bound exceeded"
    elif request != b"LIST_TASK_IDS":
        error = "task-list request did not match the fixed operation"
    else:
        try:
            tids = enumerate_owned_direct_task_ids(child_pid)
        except BaseException as exc:
            error = f"{type(exc).__name__}: {exc}"
    response = canonical({"schema": "offline-proof-task-list-v1", "status": "unavailable" if error else "ok", "tids": tids})
    response_limit = TARGET_VIEW_INTERFACES[0]["maximum_response_bytes"]
    if len(response) > response_limit or peer.send(response) != len(response):
        raise GuestError("bounded task-list response could not be delivered")
    return request_count, error, request_count > TARGET_VIEW_INTERFACES[0]["maximum_requests"] or len(request) > request_limit or request != b"LIST_TASK_IDS"

def reject_child_before_gate(child: subprocess.Popen[bytes], run_id: str, case_id: str, manifest_sha: str, started: float, deadline: float, stream_fds: dict[str, int], kill_fd: int, writer: SerialWriter, reason: str, observed_member: bool, task_peer: socket.socket, libseccomp_fd: int, task_requests: int, task_errors: list[str]) -> dict[str, Any]:
    streams = {"stdout": bytearray(), "stderr": bytearray()}
    seen = {"stdout": 0, "stderr": 0}
    observed = {"stdout": False, "stderr": False}
    truncated = {"stdout": False, "stderr": False}
    cleanup_errors: list[str] = []
    artifact_bytes = {"stdout": bytearray(), "stderr": bytearray()}
    artifact_write_failed = {"stdout": False, "stderr": False}
    artifact_sync_failed = {"stdout": False, "stderr": False}
    frame_payload_bytes_complete = {"stdout": 0, "stderr": 0}
    frame_bytes_written = {"stdout": 0, "stderr": 0}
    frame_bytes_expected = {"stdout": 0, "stderr": 0}
    frame_payload_status = {"stdout": "not_attempted", "stderr": "not_attempted"}
    frame_eof_status = {"stdout": "not_attempted", "stderr": "not_attempted"}
    drain_complete = True
    killed = False
    timed_out = False
    stream_sync = {"stdout": "unconfirmed", "stderr": "unconfirmed"}
    selector = selectors.DefaultSelector()
    for name in ("stdout", "stderr"):
        pipe = getattr(child, name)
        if pipe is None:
            continue
        try:
            os.set_blocking(pipe.fileno(), False)
            selector.register(pipe, selectors.EVENT_READ, name)
        except BaseException as exc:
            drain_complete = False
            cleanup_errors.append(f"{name} registration: {type(exc).__name__}: {exc}")
    if child.stdin is not None:
        try:
            child.stdin.close()
        except BaseException as exc:
            cleanup_errors.append(f"stdin close: {type(exc).__name__}: {exc}")
    try:
        terminate_cgroup(kill_fd)
        killed = True
    except BaseException as exc:
        cleanup_errors.append(f"cgroup termination: {type(exc).__name__}: {exc}")
    while selector.get_map():
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            drain_complete = False
            timed_out = child.poll() is None
            break
        try:
            events = selector.select(min(0.05, remaining))
        except BaseException as exc:
            drain_complete = False
            cleanup_errors.append(f"stream selector: {type(exc).__name__}: {exc}")
            break
        if time.monotonic() >= deadline:
            drain_complete = False
            timed_out = child.poll() is None
            break
        for key, _ in events:
            if time.monotonic() >= deadline:
                drain_complete = False
                timed_out = child.poll() is None
                break
            name = key.data
            try:
                block = os.read(key.fileobj.fileno(), 64 * 1024)
            except OSError as exc:
                drain_complete = False
                cleanup_errors.append(f"{name} read: {type(exc).__name__}: {exc}")
                try:
                    selector.unregister(key.fileobj)
                except BaseException:
                    pass
                continue
            if time.monotonic() >= deadline:
                observed[name] = True
                if block:
                    seen[name] += len(block)
                    room = MAX_STREAM - len(streams[name])
                    retained_after_deadline = block[:max(room, 0)]
                    streams[name].extend(retained_after_deadline)
                    truncated[name] = len(block) > room
                    if retained_after_deadline:
                        artifact_write_failed[name] = True
                drain_complete = False
                timed_out = child.poll() is None
                break
            if not block:
                observed[name] = True
                if time.monotonic() >= deadline:
                    drain_complete = False
                    timed_out = child.poll() is None
                    break
                try:
                    outcome = writer.send(run_id, name, b"", deadline=deadline)
                    frame_eof_status[name] = outcome.status
                    if not outcome.complete:
                        cleanup_errors.append(f"{name} EOF frame {outcome.status}: {outcome.reason}")
                except BaseException as exc:
                    frame_eof_status[name] = "unknown"
                    cleanup_errors.append(f"{name} EOF frame: {type(exc).__name__}: {exc}")
                selector.unregister(key.fileobj)
                continue
            observed[name] = True
            seen[name] += len(block)
            room = MAX_STREAM - len(streams[name])
            retained = block[:room] if room > 0 else b""
            if retained:
                streams[name].extend(retained)
                if not artifact_write_failed[name]:
                    view = memoryview(retained)
                    stream_sync[name] = "unconfirmed"
                    try:
                        while view:
                            if time.monotonic() >= deadline:
                                drain_complete = False
                                timed_out = child.poll() is None
                                artifact_write_failed[name] = True
                                break
                            stream_sync[name] = "unconfirmed"
                            written = os.write(stream_fds[name], view)
                            if written <= 0:
                                raise OSError("evidence write made no progress")
                            artifact_bytes[name].extend(view[:written])
                            view = view[written:]
                    except BaseException as exc:
                        artifact_write_failed[name] = True
                        cleanup_errors.append(f"{name} evidence: {type(exc).__name__}: {exc}")
                    if drain_complete and time.monotonic() < deadline:
                        try:
                            os.fsync(stream_fds[name])
                            stream_sync[name] = "synced"
                            artifact_sync_failed[name] = False
                        except BaseException as exc:
                            stream_sync[name] = "failed"
                            artifact_sync_failed[name] = True
                            cleanup_errors.append(f"{name} evidence sync: {type(exc).__name__}: {exc}")
                if not drain_complete or time.monotonic() >= deadline:
                    drain_complete = False
                    timed_out = child.poll() is None
                    break
                try:
                    outcome = writer.send(run_id, name, retained, deadline=deadline)
                    frame_bytes_written[name] += outcome.bytes_written
                    frame_bytes_expected[name] += outcome.frame_bytes
                    if outcome.complete:
                        frame_payload_bytes_complete[name] += len(retained)
                        if frame_payload_status[name] in {"not_attempted", "complete"}:
                            frame_payload_status[name] = "complete"
                    else:
                        if frame_payload_status[name] in {"not_attempted", "complete"}:
                            frame_payload_status[name] = outcome.status if outcome.started else "not_started"
                        cleanup_errors.append(f"{name} frame {outcome.status}: {outcome.reason}")
                except BaseException as exc:
                    if frame_payload_status[name] in {"not_attempted", "complete"}:
                        frame_payload_status[name] = "unknown"
                    cleanup_errors.append(f"{name} frame: {type(exc).__name__}: {exc}")
            if len(block) > room:
                truncated[name] = True
                selector.unregister(key.fileobj)
        if not drain_complete:
            break
        if time.monotonic() >= deadline:
            drain_complete = False
            timed_out = child.poll() is None
    returncode = child.poll()
    if returncode is None:
        remaining = max(0.0, deadline - time.monotonic())
        if remaining > 0:
            try:
                child.wait(timeout=remaining)
            except subprocess.TimeoutExpired:
                timed_out = True
            except BaseException as exc:
                cleanup_errors.append(f"bounded reap: {type(exc).__name__}: {exc}")
        returncode = child.poll()
        if returncode is None:
            try:
                terminate_cgroup(kill_fd)
                killed = True
            except BaseException as exc:
                cleanup_errors.append(f"final cgroup termination: {type(exc).__name__}: {exc}")
    try:
        selector.close()
    except BaseException as exc:
        cleanup_errors.append(f"selector close: {type(exc).__name__}: {exc}")
    task_peer.close()
    if libseccomp_fd >= 0:
        try:
            os.close(libseccomp_fd)
        except OSError as exc:
            cleanup_errors.append(f"loader descriptor close: {type(exc).__name__}: {exc}")
    for name in ("stdout", "stderr"):
        pipe = getattr(child, name)
        if pipe is not None:
            try:
                pipe.close()
            except BaseException as exc:
                cleanup_errors.append(f"{name} close: {type(exc).__name__}: {exc}")
    for name, fd in stream_fds.items():
        if time.monotonic() < deadline:
            try:
                os.fsync(fd)
                stream_sync[name] = "synced"
                artifact_sync_failed[name] = False
            except OSError as exc:
                stream_sync[name] = "failed"
                artifact_sync_failed[name] = True
                cleanup_errors.append(f"stream sync: {type(exc).__name__}: {exc}")
        try:
            os.close(fd)
        except OSError as exc:
            cleanup_errors.append(f"stream close: {type(exc).__name__}: {exc}")
    result = {
        "run_id": run_id,
        "case_id": case_id,
        "manifest_sha256": manifest_sha,
        "target": "harmless-fixture.py",
        "status": "rejected",
        "reason": reason,
        "exit_code": returncode,
        "reaped": returncode is not None,
        "timed_out": timed_out,
        "streams_incomplete": not drain_complete,
        "cgroup_killed": killed,
        "cleanup_errors": cleanup_errors,
        "started_monotonic": started,
        "finished_monotonic": time.monotonic(),
        "streams": {
            name: {
                "observed": observed[name],
                "bytes_seen": seen[name],
                "truncated": truncated[name],
                "memory": {
                    "bytes_retained": len(streams[name]),
                    "sha256": sha256(bytes(streams[name])) if observed[name] or seen[name] else None,
                },
                "artifact": {
                    "status": (
                        "unobserved" if not observed[name]
                        else "unknown" if stream_sync[name] != "synced"
                        else "partial" if artifact_write_failed[name]
                        else "complete"
                    ),
                    "bytes_written": len(artifact_bytes[name]),
                    "sha256": sha256(bytes(artifact_bytes[name])) if observed[name] and stream_sync[name] == "synced" else None,
                    "path": f"evidence/{name}.bin" if observed[name] and stream_sync[name] == "synced" else None,
                    "sync": "failed" if artifact_sync_failed[name] or stream_sync[name] == "failed" else "synced" if stream_sync[name] == "synced" else "unconfirmed",
                },
                "frame": {
                    "payload_status": (
                        "not_observed" if not observed[name]
                        else frame_payload_status[name] if frame_payload_status[name] != "not_attempted"
                        else "not_started" if frame_payload_bytes_complete[name] != len(streams[name])
                        else "complete"
                    ),
                    "payload_bytes_in_complete_frames": frame_payload_bytes_complete[name],
                    "payload_bytes_expected": len(streams[name]),
                    "frame_bytes_written": frame_bytes_written[name],
                    "frame_bytes_expected": frame_bytes_expected[name],
                    "receiver_observed": "unknown",
                    "eof_status": frame_eof_status[name],
                },
            }
            for name in streams
        },
        "cgroup": {"pids_max": 3, "target_pid": child.pid, "observed_member": observed_member},
        "task_listing": {"requests": task_requests, "errors": task_errors},
        "published": False,
    }
    terminal_outcome = writer.not_started("writer-poisoned" if writer.poisoned else "deadline-before-terminal") if time.monotonic() >= deadline or writer.poisoned else send_json(writer, run_id, "control", result, deadline=deadline)
    result["terminal_delivery"] = terminal_outcome.as_dict()
    return result
def collect_child(run_id: str, case_id: str, manifest_sha: str, runtime_identity_sha: str, budget_ms: int, identity: dict[str, Any], proof_root: Path, view_root: Path, target_view: dict[str, Any], group: Path, kill_fd: int, procs_fd: int, writer: SerialWriter) -> dict[str, Any]:
    started = time.monotonic()
    deadline = started + budget_ms / 1000
    stream_fds: dict[str, int] = {}
    libseccomp_fd = -1
    task_peer: socket.socket | None = None
    task_child: socket.socket | None = None
    try:
        prepare_run_output(proof_root, run_id)
        stream_fds = reserve_stream_files(proof_root)
        libseccomp_fd = open_verified_libseccomp_fd(identity, target_view)
        task_peer_raw, task_child_raw = socket.socketpair(socket.AF_UNIX, socket.SOCK_SEQPACKET)
        task_peer_fd = -1
        task_child_fd = -1
        try:
            task_peer_fd = fcntl.fcntl(task_peer_raw.fileno(), fcntl.F_DUPFD_CLOEXEC, 10)
            task_child_fd = fcntl.fcntl(task_child_raw.fileno(), fcntl.F_DUPFD_CLOEXEC, 10)
        except BaseException:
            if task_peer_fd >= 0:
                os.close(task_peer_fd)
            if task_child_fd >= 0:
                os.close(task_child_fd)
            raise
        finally:
            task_peer_raw.close()
            task_child_raw.close()
        try:
            task_peer = socket.socket(fileno=task_peer_fd)
            task_peer_fd = -1
            task_child = socket.socket(fileno=task_child_fd)
            task_child_fd = -1
            task_peer.setblocking(False)
        except BaseException:
            if task_peer is not None:
                task_peer.close()
            if task_child is not None:
                task_child.close()
            if task_peer_fd >= 0:
                os.close(task_peer_fd)
            if task_child_fd >= 0:
                os.close(task_child_fd)
            raise
        env = {"PATH": "/usr/bin:/bin", "HOME": "/proof/home", "TMPDIR": "/proof/tmp", "LANG": "C.UTF-8"}
        command = ["/usr/bin/python3.13", "-I", "-S", "-B", str(BOOTSTRAP), "--case", case_id, "--output-root", f"/proof/out/{run_id}", "--run-id", run_id, "--manifest-sha256", manifest_sha, "--runtime-identity-sha256", runtime_identity_sha]
    except BaseException:
        if task_peer is not None:
            task_peer.close()
        if task_child is not None:
            task_child.close()
        if libseccomp_fd >= 0:
            os.close(libseccomp_fd)
        for stream_fd in stream_fds.values():
            os.close(stream_fd)
        raise

    def enter_limited_cgroup() -> None:
        try:
            write_all(procs_fd, f"{os.getpid()}\n".encode("ascii"))
        finally:
            os.close(procs_fd)
        os.dup2(libseccomp_fd, 3, inheritable=True)
        os.dup2(task_child.fileno(), 4, inheritable=True)
        for fd in (libseccomp_fd, task_child.fileno()):
            if fd not in (3, 4):
                os.close(fd)
        os.chroot(view_root)
        os.chdir("/")
    placeholder_fds: list[int] = []
    placeholder_cleanup_errors: list[str] = []
    try:
        for target_fd in (3, 4):
            try:
                fcntl.fcntl(target_fd, fcntl.F_GETFD)
            except OSError as exc:
                if exc.errno != errno.EBADF:
                    raise
                placeholder_fd = os.open(os.devnull, os.O_RDONLY | getattr(os, "O_CLOEXEC", 0))
                placeholder_fds.append(placeholder_fd)
                if placeholder_fd != target_fd:
                    raise GuestError(f"could not reserve fixed child descriptor {target_fd}")
        pass_fds = tuple(sorted({3, 4, procs_fd, libseccomp_fd, task_child.fileno()}))
        child = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, close_fds=True, pass_fds=pass_fds, env=env, cwd="/proof", preexec_fn=enter_limited_cgroup, bufsize=0)
        task_child.close()
    except BaseException:
        task_peer.close()
        task_child.close()
        os.close(libseccomp_fd)
        for stream_fd in stream_fds.values():
            os.close(stream_fd)
        raise
    finally:
        for placeholder_fd in placeholder_fds:
            try:
                os.close(placeholder_fd)
            except OSError as exc:
                placeholder_cleanup_errors.append(f"{type(exc).__name__}: {exc}")
    if placeholder_cleanup_errors:
        return reject_child_before_gate(child, run_id, case_id, manifest_sha, started, deadline, stream_fds, kill_fd, writer, "descriptor placeholder close: " + "; ".join(placeholder_cleanup_errors), False, task_peer, libseccomp_fd, 0, [])
    observed_member = False
    task_requests = 0
    task_errors: list[str] = []
    try:
        if child.pid <= 0:
            fail("spawn returned a non-positive target pid")
        proc_list = (group / "cgroup.procs").read_text(encoding="ascii").split()
        pids_current = int((group / "pids.current").read_text(encoding="ascii").strip())
        if str(child.pid) not in proc_list or pids_current != 1:
            fail("target process was not observed alone in its pids-limited cgroup")
        observed_member = True
        install_target_view_dynamic(view_root, proof_root, child.pid, run_id, libseccomp_fd)
        verify_target_view_mounts(view_root, proof_root, target_view, child.pid, run_id, libseccomp_fd, identity["libseccomp_path"])
        os.close(libseccomp_fd)
        libseccomp_fd = -1
        gate = b"OFFLINE-PROOF-GO\x00" + run_id.encode("ascii") + b"\x00" + manifest_sha.encode("ascii") + b"\n"
        if child.stdin is None:
            fail("target bootstrap gate unavailable")
        write_all(child.stdin.fileno(), gate)
        child.stdin.close()
    except BaseException as exc:
        return reject_child_before_gate(child, run_id, case_id, manifest_sha, started, deadline, stream_fds, kill_fd, writer, f"{type(exc).__name__}: {exc}", observed_member, task_peer, libseccomp_fd, task_requests, task_errors)
    selector = selectors.DefaultSelector()
    assert child.stdout is not None and child.stderr is not None
    selector.register(child.stdout, selectors.EVENT_READ, "stdout")
    selector.register(child.stderr, selectors.EVENT_READ, "stderr")
    selector.register(task_peer, selectors.EVENT_READ, "task-list")
    streams = {"stdout": bytearray(), "stderr": bytearray()}
    observed = {"stdout": 0, "stderr": 0}
    truncated = {"stdout": False, "stderr": False}
    frame_payload_bytes_complete = {"stdout": 0, "stderr": 0}
    frame_bytes_written = {"stdout": 0, "stderr": 0}
    frame_bytes_expected = {"stdout": 0, "stderr": 0}
    frame_payload_status = {"stdout": "not_attempted", "stderr": "not_attempted"}
    frame_eof_status = {"stdout": "not_attempted", "stderr": "not_attempted"}
    timed_out = False
    cgroup_killed = False
    while selector.get_map() or child.poll() is None:
        remaining = deadline - time.monotonic()
        if remaining <= 0 and child.poll() is None:
            timed_out = True
            terminate_cgroup(kill_fd)
            cgroup_killed = True
        events = selector.select(max(0.0, min(0.1, max(remaining, 0.0)))) if selector.get_map() else []
        for key, _ in events:
            if key.data == "task-list":
                try:
                    task_requests, error, close_channel = task_list_response(task_peer, child.pid, task_requests)
                    if error is not None:
                        task_errors.append(error)
                    if close_channel:
                        selector.unregister(task_peer)
                        task_peer.close()
                except BaseException as exc:
                    task_errors.append(f"{type(exc).__name__}: {exc}")
                    selector.unregister(task_peer)
                    task_peer.close()
                continue
            block = os.read(key.fileobj.fileno(), 64 * 1024)
            if not block:
                name = key.data
                if name not in {"stdout", "stderr"}:
                    fail("unknown child stream reached EOF")
                outcome = writer.send(run_id, name, b"", deadline=deadline)
                frame_eof_status[name] = outcome.status
                selector.unregister(key.fileobj)
                continue
            name = key.data
            observed[name] += len(block)
            room = MAX_STREAM - len(streams[name])
            retained = block[:room] if room > 0 else b""
            if retained:
                streams[name].extend(retained)
                write_all(stream_fds[name], retained)
                os.fsync(stream_fds[name])
                outcome = writer.send(run_id, name, retained, deadline=deadline)
                frame_bytes_written[name] += outcome.bytes_written
                frame_bytes_expected[name] += outcome.frame_bytes
                if outcome.complete:
                    frame_payload_bytes_complete[name] += len(retained)
                    if frame_payload_status[name] in {"not_attempted", "complete"}:
                        frame_payload_status[name] = "complete"
                elif frame_payload_status[name] in {"not_attempted", "complete"}:
                    frame_payload_status[name] = outcome.status if outcome.started else "not_started"
            if len(block) > room:
                truncated[name] = True
                if not cgroup_killed:
                    terminate_cgroup(kill_fd)
                    cgroup_killed = True
        if (timed_out or any(truncated.values())) and child.poll() is None:
            try:
                child.wait(timeout=0.1)
            except subprocess.TimeoutExpired:
                terminate_cgroup(kill_fd)
                cgroup_killed = True
    if selector.get_map():
        for key in list(selector.get_map().values()):
            selector.unregister(key.fileobj)
            if key.data == "task-list":
                task_peer.close()
    selector.close()
    task_peer.close()
    returncode = child.wait()
    for stream_fd in stream_fds.values():
        os.fsync(stream_fd)
        os.close(stream_fd)
    result = {
        "run_id": run_id,
        "case_id": case_id,
        "manifest_sha256": manifest_sha,
        "target": "harmless-fixture.py",
        "status": "timed_out" if timed_out else "truncated" if any(truncated.values()) else "exited" if returncode == 0 else "rejected",
        "exit_code": returncode,
        "timed_out": timed_out,
        "cgroup_killed": cgroup_killed,
        "started_monotonic": started,
        "finished_monotonic": time.monotonic(),
        "streams": {name: {"observed": True, "bytes_seen": observed[name], "bytes_retained": len(streams[name]), "sha256": sha256(bytes(streams[name])), "truncated": truncated[name], "path": f"evidence/{name}.bin", "frame": {"payload_status": frame_payload_status[name] if frame_payload_status[name] != "not_attempted" else "not_started", "payload_bytes_in_complete_frames": frame_payload_bytes_complete[name], "payload_bytes_expected": len(streams[name]), "frame_bytes_written": frame_bytes_written[name], "frame_bytes_expected": frame_bytes_expected[name], "receiver_observed": "unknown", "eof_status": frame_eof_status[name]}} for name in streams},
        "task_listing": {"requests": task_requests, "errors": task_errors},
        "cgroup": {"pids_max": 3, "target_pid": child.pid, "observed_member": True},
        "published": False,
    }
    if case_id == "H7-guest-transport-failure":
        terminal_outcome = writer.not_started("writer-poisoned" if writer.poisoned else "deadline-before-terminal") if time.monotonic() >= deadline or writer.poisoned else writer.send_corrupt(run_id, "control", canonical(result), deadline=deadline)
    else:
        terminal_outcome = writer.not_started("writer-poisoned" if writer.poisoned else "deadline-before-terminal") if time.monotonic() >= deadline or writer.poisoned else send_json(writer, run_id, "control", result, deadline=deadline)
    result["terminal_delivery"] = terminal_outcome.as_dict()
    return result


def _read_kernel_image(path: Path) -> bytes:
    raw = bounded_file(path, 128 * MIB)
    if raw.startswith(b"\x1f\x8b"):
        try:
            raw = gzip.decompress(raw)
        except (OSError, EOFError) as exc:
            raise GuestError("kernel gzip image is malformed") from exc
        if len(raw) > 128 * MIB:
            fail("decompressed kernel exceeds the approved bound")
    if len(raw) < 64 or raw[56:60] != b"ARM\x64":
        fail("kernel is not an uncompressed AArch64 Image accepted by direct vfkit boot")
    return raw


def _initrd_names(raw: bytes) -> set[str]:
    if raw.startswith(b"\x1f\x8b"):
        try:
            payload = gzip.decompress(raw)
        except (OSError, EOFError) as exc:
            raise GuestError("initrd gzip archive is malformed") from exc
    else:
        payload = raw
    if len(payload) > 512 * MIB:
        fail("expanded initrd exceeds the inspection bound")
    names: set[str] = set()
    offset = 0
    saw_trailer = False
    while offset + 110 <= len(payload) and payload[offset:offset + 6] in {b"070701", b"070702"}:
        header = payload[offset:offset + 110]
        try:
            file_size = int(header[54:62], 16)
            name_size = int(header[94:102], 16)
        except ValueError as exc:
            raise GuestError("initrd cpio header is malformed") from exc
        if not 1 <= name_size <= 4096 or file_size > 128 * MIB:
            fail("initrd cpio entry exceeds fixed bounds")
        name_start = offset + 110
        name_end = name_start + name_size
        if name_end > len(payload) or payload[name_end - 1] != 0:
            fail("initrd cpio name is truncated")
        name = payload[name_start:name_end - 1].decode("utf-8", "strict")
        data_start = (name_end + 3) & ~3
        data_end = data_start + file_size
        if data_end > len(payload):
            fail("initrd cpio data is truncated")
        if name == "TRAILER!!!":
            saw_trailer = True
        else:
            names.add(name.lstrip("./"))
        offset = (data_end + 3) & ~3
    if not saw_trailer:
        fail("initrd is not a complete newc/crc cpio archive")
    return names


def _verify_kernel_features(kernel_release: str, initrd_raw: bytes) -> None:
    config = bounded_file(Path("/boot") / f"config-{kernel_release}", 4 * MIB).decode("ascii", "strict")
    settings: dict[str, str] = {}
    for line in config.splitlines():
        match = re.fullmatch(r"CONFIG_([A-Z0-9_]+)=([ym])", line)
        if match:
            settings[match.group(1)] = match.group(2)
    required = {
        "CGROUPS": "cgroups", "CGROUP_PIDS": "pids controller", "NAMESPACES": "mount namespaces",
        "SECCOMP": "seccomp", "SECCOMP_FILTER": "seccomp filters", "EXT4_FS": "ext4",
        "USB": "USB", "USB_XHCI_HCD": "USB xHCI", "USB_STORAGE": "USB storage",
        "SCSI": "SCSI", "BLK_DEV_SD": "SCSI disk", "VIRTIO_BLK": "virtio block",
        "VIRTIO_PCI": "virtio PCI", "VIRTIO_CONSOLE": "virtio serial", "HW_RANDOM_VIRTIO": "virtio RNG",
    }
    module_names = _initrd_names(initrd_raw)
    module_files = {
        "EXT4_FS": ("ext4",), "USB_XHCI_HCD": ("xhci_hcd", "xhci_pci"),
        "USB_STORAGE": ("usb_storage",), "BLK_DEV_SD": ("sd_mod",),
        "SCSI": ("scsi_mod",), "VIRTIO_BLK": ("virtio_blk",), "VIRTIO_PCI": ("virtio_pci",),
        "VIRTIO_CONSOLE": ("virtio_console",), "HW_RANDOM_VIRTIO": ("virtio_rng",),
    }
    for key, label in required.items():
        value = settings.get(key)
        if value == "y":
            continue
        if value != "m":
            fail(f"pinned guest kernel lacks required {label} support")
        candidates = module_files.get(key, (key.lower().replace("_", "-"),))
        suffixes = (".ko", ".ko.xz", ".ko.zst", ".ko.gz")
        if not any(any(name.endswith("/" + candidate + suffix) or name == candidate + suffix for suffix in suffixes) for name in module_names for candidate in candidates):
            fail(f"initrd does not contain required {label} kernel module")


def _stable_file_digest(path: Path, maximum: int) -> tuple[str, int]:
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > maximum:
            fail(f"library is not a bounded regular file: {path}")
        h = hashlib.sha256()
        total = 0
        while True:
            block = os.read(fd, CHUNK)
            if not block:
                break
            total += len(block)
            if total > maximum:
                fail("runtime library grew beyond its fixed bound")
            h.update(block)
        after = os.fstat(fd)
        if (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) or total != before.st_size:
            fail("runtime library changed while hashing")
        return h.hexdigest(), total
    finally:
        os.close(fd)


def _libseccomp_identity() -> tuple[str, str, int]:
    listed = subprocess.run(["/usr/bin/dpkg-query", "-L", "libseccomp2"], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=False, text=True, encoding="utf-8")
    if listed.returncode != 0:
        fail("cannot resolve libseccomp2 package-owned library path")
    candidates: list[Path] = []
    for line in listed.stdout.splitlines():
        path = Path(line)
        if path.parent == Path("/usr/lib/aarch64-linux-gnu") and path.name.startswith("libseccomp.so.2.") and not path.is_symlink() and path.is_file():
            candidates.append(path)
    if len(candidates) != 1:
        fail("libseccomp2 package does not resolve to exactly one regular versioned AArch64 library")
    path = candidates[0]
    info = path.lstat()
    digest, size = _stable_file_digest(path, 16 * MIB)
    raw = bounded_file(path, 16 * MIB)
    if info.st_uid != 0 or info.st_mode & 0o022 or len(raw) < 20 or raw[:4] != b"\x7fELF" or raw[4] != 2 or raw[5] != 1 or int.from_bytes(raw[18:20], "little") != 183:
        fail("libseccomp2 library is not a protected AArch64 ELF object")
    return str(path), digest, size


def _write_runtime_identity(value: dict[str, Any]) -> None:
    path = ROOT / "runtime.json"
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o400)
    try:
        write_all(fd, canonical(value) + b"\n")
        os.fsync(fd)
        os.fchmod(fd, 0o400)
    finally:
        os.close(fd)

def prepare_mode(writer: SerialWriter, run_id: str, expected_manifest_sha256: str) -> dict[str, Any]:
    deadline = time.monotonic() + PREPARATION_BUDGET_SECONDS
    manifest = load_manifest(expected_manifest_sha256)
    verify_closure(manifest)
    if platform.machine() not in {"aarch64", "arm64"}:
        fail("preparation guest is not AArch64")
    locked = manifest["guest_runtime"]["package_versions"]
    package_observations: dict[str, str] = {}
    for name, version in locked.items():
        result = subprocess.run(["/usr/bin/dpkg-query", "-W", "-f=${Version}", name], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=False, text=True, encoding="ascii")
        if result.returncode != 0 or result.stdout.strip() != version:
            fail(f"pinned guest package mismatch: {name}")
        package_observations[name] = result.stdout.strip()
    kernel_release = subprocess.run(["/bin/uname", "-r"], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=5, check=True, text=True, encoding="ascii").stdout.strip()
    if not kernel_release or len(kernel_release) > 128 or "/" in kernel_release:
        fail("running kernel release is malformed")
    kernel = Path("/boot") / f"vmlinuz-{kernel_release}"
    initrd = Path("/boot") / f"initrd.img-{kernel_release}"
    kernel_raw = _read_kernel_image(kernel)
    initrd_raw = bounded_file(initrd, 128 * MIB)
    _verify_kernel_features(kernel_release, initrd_raw)
    root_source, _root_options = root_mount_source()
    if not re.fullmatch(r"/dev/vda[0-9]+", root_source) or Path("/sys/block/vda/ro").read_text(encoding="ascii").strip() != "0":
        fail("preparation root is not mounted from the acquired writable virtio image")
    root_device_name = Path(root_source).name
    root_sys = Path("/sys/class/block") / root_device_name
    if not root_sys.is_dir():
        fail("preparation root partition geometry is unavailable")
    root_start_sector = (root_sys / "start").read_text(encoding="ascii").strip()
    root_size_sectors = (root_sys / "size").read_text(encoding="ascii").strip()
    if not root_start_sector.isdigit() or not root_size_sectors.isdigit() or int(root_start_sector) < 1 or int(root_size_sectors) < 1:
        fail("preparation root partition geometry is malformed")
    root_uuid = mounted_root_uuid(root_source)
    libseccomp_path, libseccomp_sha, libseccomp_bytes = _libseccomp_identity()
    runtime_identity = {
        "schema": "offline-proof-guest-runtime-v1",
        "manifest_sha256": manifest["manifest_sha256"],
        "architecture": "aarch64",
        "kernel_release": kernel_release,
        "rootfs_uuid": root_uuid,
        "libseccomp_path": libseccomp_path,
        "libseccomp_sha256": libseccomp_sha,
        "libseccomp_bytes": libseccomp_bytes,
        "libseccomp_package_version": locked["libseccomp2"],
        "package_versions": package_observations,
    }
    runtime_identity_sha = sha256(canonical(runtime_identity))
    _write_runtime_identity(runtime_identity)
    try:
        os.mkdir("/inspection", mode=0o700)
        os.chmod("/inspection", 0o700)
    except FileExistsError as exc:
        raise GuestError("inspection mountpoint already exists in the acquired guest image") from exc
    report = {
        "schema": "offline-proof-preparation-export-v1",
        "run_id": run_id,
        "manifest_sha256": manifest["manifest_sha256"],
        "kernel_release": kernel_release,
        "kernel_bytes": len(kernel_raw),
        "kernel_sha256": sha256(kernel_raw),
        "initrd_bytes": len(initrd_raw),
        "initrd_sha256": sha256(initrd_raw),
        "rootfs_uuid": root_uuid,
        "libseccomp_path": libseccomp_path,
        "libseccomp_sha256": libseccomp_sha,
        "libseccomp_bytes": libseccomp_bytes,
        "runtime_identity_sha256": runtime_identity_sha,
        "package_versions": package_observations,
        "source_file_count": len(manifest["source_files"]),
        "packet_count": len(manifest["packet_files"]),
        "grader_file_count": len(manifest["grader_files"]),
        "root_partition_start_sector": int(root_start_sector),
        "root_partition_sectors": int(root_size_sectors),
        "root_partition_device": root_device_name,
        "operator_execution": "DENY",
    }
    require_serial_complete(writer.send(run_id, "control", canonical({"artifact": "kernel", "bytes": len(kernel_raw), "sha256": report["kernel_sha256"]}), deadline=deadline), "kernel metadata")
    for offset in range(0, len(kernel_raw), CHUNK):
        require_serial_complete(writer.send(run_id, "kernel", kernel_raw[offset:offset + CHUNK], deadline=deadline), "kernel chunk")
    require_serial_complete(writer.send(run_id, "control", canonical({"artifact": "initrd", "bytes": len(initrd_raw), "sha256": report["initrd_sha256"]}), deadline=deadline), "initrd metadata")
    for offset in range(0, len(initrd_raw), CHUNK):
        require_serial_complete(writer.send(run_id, "initrd", initrd_raw[offset:offset + CHUNK], deadline=deadline), "initrd chunk")
    os.sync()
    require_serial_complete(send_json(writer, run_id, "control", report, deadline=deadline), "preparation report")
    require_serial_complete(writer.send(run_id, "control", canonical({"schema": "offline-proof-preparation-shutdown-v1", "status": "clean-shutdown-requested", "run_id": run_id, "manifest_sha256": manifest["manifest_sha256"], "runtime_identity_sha256": runtime_identity_sha, "rootfs_uuid": root_uuid, "kernel_sha256": report["kernel_sha256"], "initrd_sha256": report["initrd_sha256"]}), deadline=deadline), "preparation shutdown")
    return report


def inspect_mode(writer: SerialWriter, params: dict[str, str]) -> dict[str, Any]:
    deadline = time.monotonic() + min(int(params["offlineproof.budget_ms"]), INSPECTION_BUDGET_MAX_MS) / 1000
    if os.geteuid() != 0:
        fail("inspection controller must start privileged")
    run_id = params["offlineproof.runid"]
    source_run_id = params["offlineproof.source_runid"]
    manifest = load_manifest(params["offlineproof.manifest"])
    verify_runtime_root(expected_readonly=True)
    device = Path("/dev/sdb")
    if not device.exists() or device.is_symlink() or not stat.S_ISBLK(device.lstat().st_mode):
        fail("second sealed readonly evidence USB block device missing")
    if Path("/sys/block/sdb/ro").read_text(encoding="ascii").strip() != "1" or Path("/sys/block/sdb/size").read_text(encoding="ascii").strip() != "8388608":
        fail("inspection evidence device is writable or not exactly 4 GiB")
    identity = subprocess.run(["/sbin/blkid", "-p", "-s", "LABEL", "-o", "value", str(device)], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=10, check=False, text=True, encoding="ascii")
    if identity.returncode != 0 or identity.stdout.strip() != f"proof-{source_run_id[:16]}":
        fail("readonly evidence image label does not match the independently supplied source run")
    target = Path("/inspection")
    if not target.is_dir() or target.is_symlink() or any(target.iterdir()):
        fail("fixed inspection mountpoint is absent, unsafe or nonempty")
    mount_call(b"/dev/sdb", b"/inspection", b"ext4", (1 << 0) | (1 << 1) | (1 << 2) | (1 << 3), b"ro,noload,nodev,nosuid,noexec")
    mountinfo = Path("/proc/self/mountinfo").read_text(encoding="ascii")
    mounts = []
    for line in mountinfo.splitlines():
        pre, separator, post = line.partition(" - ")
        fields = pre.split()
        if separator and len(fields) >= 6 and fields[4] == "/inspection":
            mounts.append((set(fields[5].split(",")), post.split()))
    if len(mounts) != 1 or "ro" not in mounts[0][0] or not {"nodev", "nosuid", "noexec"}.issubset(mounts[0][0]) or len(mounts[0][1]) < 3 or mounts[0][1][0] != "ext4" or mounts[0][1][1] != "/dev/sdb" or "noload" not in mounts[0][1][2].split(","):
        fail("evidence filesystem is not mounted from the fixed readonly device without journal replay")
    proof = target
    if not proof.is_dir() or proof.is_symlink():
        fail("evidence image root is absent or unsafe")
    proof_device = os.stat(proof).st_dev
    entry_count = 0
    records: list[dict[str, Any]] = []
    directories = {"proof"}
    pending: list[tuple[Path, str]] = [(proof, "proof")]
    total_bytes = 0
    while pending:
        directory, prefix = pending.pop()
        with os.scandir(directory) as entries:
            for entry in sorted(entries, key=lambda item: item.name, reverse=True):
                entry_count += 1
                if entry_count > 20000:
                    fail("inspection evidence exceeds the fixed entry-count bound")
                path = Path(entry.path)
                info = entry.stat(follow_symlinks=False)
                if stat.S_ISLNK(info.st_mode):
                    fail("inspection encountered a symbolic link")
                relative = f"{prefix}/{entry.name}"
                if len(relative.encode("utf-8")) > 4096:
                    fail("inspection path exceeds fixed bound")
                if stat.S_ISDIR(info.st_mode):
                    if info.st_dev != proof_device:
                        fail("inspection encountered a nested filesystem")
                    directories.add(relative)
                    pending.append((path, relative))
                    continue
                if not stat.S_ISREG(info.st_mode) or info.st_dev != proof_device:
                    fail("inspection encountered a non-regular or foreign-device object")
                total_bytes += info.st_size
                if total_bytes > 4 * 1024 * 1024 * 1024 or len(records) >= 10000:
                    fail("inspection evidence exceeds fixed filesystem bounds")
                digest = None
                if info.st_size <= 64 * MIB:
                    raw = bounded_file(path, 64 * MIB)
                    if len(raw) != info.st_size:
                        fail("inspection file changed size while read")
                    digest = sha256(raw)
                records.append({"path": relative, "bytes": info.st_size, "sha256": digest})
    records.sort(key=lambda row: row["path"])
    seen = {row["path"] for row in records}
    if not {"proof/evidence/stdout.bin", "proof/evidence/stderr.bin"}.issubset(seen) or "proof/out" not in directories:
        fail("inspection source lacks both streams or its fixed output tree")
    result = {
        "schema": "offline-proof-inspection-v1",
        "run_id": run_id,
        "source_run_id": source_run_id,
        "case_id": params["offlineproof.case"],
        "manifest_sha256": manifest["manifest_sha256"],
        "image_sha256": params["offlineproof.image_sha256"],
        "files": records,
        "directories": sorted(directories),
        "mount_options": "ro,noload,nodev,nosuid,noexec",
        "journal_replay": False,
        "status": "read-only-evidence-captured",
    }
    require_serial_complete(send_json(writer, run_id, "control", result, deadline=deadline), "inspection terminal")
    return result


def run_mode() -> int:
    params = parse_cmdline()
    run_id = params["offlineproof.runid"]
    writer = SerialWriter()
    try:
        manifest = load_manifest(params["offlineproof.manifest"])
        verify_closure(manifest)
        enter_mount_namespace()
        if params["offlineproof.mode"] == "inspection":
            result = inspect_mode(writer, params)
            return 0 if result["status"] == "read-only-evidence-captured" else 1
        verify_runtime_root(expected_readonly=True, runtime_partitioned=True)
        target_view = read_target_view_device(params, manifest)
        identity = load_runtime_identity_for_handoff(manifest, params["offlineproof.runtime_identity"])
        proof_root = mount_proof_device(run_id)
        view_root = build_target_view(proof_root, run_id, target_view, identity["libseccomp_path"])
        group, kill_fd, procs_fd = mount_readonly_cgroup_and_create_domain()
        try:
            result = collect_child(run_id, params["offlineproof.case"], params["offlineproof.manifest"], params["offlineproof.runtime_identity"], int(params["offlineproof.budget_ms"]), identity, proof_root, view_root, target_view, group, kill_fd, procs_fd, writer)
        finally:
            os.close(procs_fd)
            os.close(kill_fd)
        return 0 if result["status"] == "exited" and result["exit_code"] == 0 and result["terminal_delivery"]["status"] == "complete" else 1
    finally:
        writer.close()


def poweroff() -> None:
    libc = ctypes.CDLL("/lib/aarch64-linux-gnu/libc.so.6", use_errno=True)
    libc.reboot.argtypes = [ctypes.c_int]
    libc.reboot.restype = ctypes.c_int
    if libc.reboot(0x4321FEDC) != 0:
        fail(f"guest poweroff failed: errno {ctypes.get_errno()}")

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="mode", required=True)
    prep = sub.add_parser("prepare")
    prep.add_argument("--run-id", required=True)
    prep.add_argument("--manifest-sha256", required=True)
    inspection = sub.add_parser("inspect")
    inspection.add_argument("--run-id", required=True)
    inspection.add_argument("--manifest-sha256", required=True)
    sub.add_parser("proof-init")
    args = parser.parse_args(argv)
    if args.mode == "proof-init":
        try:
            return run_mode()
        finally:
            poweroff()
    writer = SerialWriter()
    try:
        if args.mode == "prepare":
            if not re.fullmatch(r"[0-9a-f]{64}", args.manifest_sha256):
                fail("preparation manifest digest argument malformed")
            report = prepare_mode(writer, args.run_id, args.manifest_sha256)
        else:
            fail("inspection is available only through the isolated read-only inspection kernel mode")
    finally:
        writer.close()
    shutdown = subprocess.run(["/usr/bin/systemctl", "poweroff", "--no-wall"], stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30, check=False)
    if shutdown.returncode != 0:
        fail(f"clean systemd poweroff request failed with status {shutdown.returncode}")
    shutdown_deadline = time.monotonic() + 60
    while time.monotonic() < shutdown_deadline:
        time.sleep(0.25)
    fail("guest remained running after the clean systemd poweroff request")
    return 0


if __name__ == "__main__":
    try:
        status = main()
    except BaseException as exc:
        try:
            msg = f"guest-supervisor: {type(exc).__name__}: {exc}\n".encode("utf-8", "replace")[:4096]
            os.write(2, msg)
        finally:
            raise SystemExit(70)
    raise SystemExit(status)
