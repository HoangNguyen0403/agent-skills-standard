#!/usr/bin/env python3
"""One-shot vfkit controller. VM starts require a separate post-review controller release."""
from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import selectors
import shutil
import signal
import fcntl
import socket
import stat
import plistlib
import subprocess
import platform
import sys
import time
import uuid
import struct
import zlib
from typing import Any
from urllib.parse import urlsplit

HERE = Path(__file__).absolute().parent
E = HERE.parents[1]
REPO = HERE.parents[4]
STORAGE = Path("/Users/Shared/ass-qf5-linux-v1")
sys.path.insert(0, str(HERE))
from debian_contract import DebianMetadataError, debian_archive_basename, debian_build_metadata, validate_extraction_record
from protocol import FrameDecoder, ProtocolError
LOCK = HERE / "backend.lock.json"
POLICY = HERE / "policy.json"
STATIC_REVIEW = HERE / "static-review.md"
MAGIC = b"QF5OFFLINE\x01"
HEADER_LIMIT = 4096
STREAM_LIMIT = 16 * 1024 * 1024
TRANSPORT_LIMIT = 66 * 1024 * 1024
RECORD_LIMIT = 1024 * 1024
STATE_OBSERVATION_LIMIT = 2 * 1024 * 1024
CHUNK = 64 * 1024
RUN_ID_RE = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
FIXTURE_IDS = tuple(f"H{i}-{name}" for i, name in enumerate(("positive-isolation", "aggregate-storage", "stdout-overflow", "stderr-overflow", "deadline", "host-interruption", "guest-transport-failure", "one-shot-replay"), 1))
INSPECTION_IDS = ("I1-read-only-integrity", "I2-replay-free-evidence")
CLOSURE_AUTHORITY_HOLD = "preflight HOLD: no independently approved complete frozen-closure map binds the staged source/packet/grader/native-manifest/runtime file identities; candidate self-enrolment is not authorization"


class LaunchError(RuntimeError):
    pass


class FrameError(ValueError):
    pass


def fail(message: str) -> "NoReturn":
    raise LaunchError(message)


def canonical(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def open_directory_chain(path: Path) -> int:
    absolute = path.absolute()
    directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    current = os.open(absolute.anchor, directory_flags)
    try:
        for component in absolute.parts[1:]:
            next_fd = os.open(component, directory_flags, dir_fd=current)
            info = os.fstat(next_fd)
            if not stat.S_ISDIR(info.st_mode):
                os.close(next_fd)
                fail(f"non-directory component in protected path: {absolute}")
            os.close(current)
            current = next_fd
        return current
    except BaseException:
        os.close(current)
        raise


def safe_read(path: Path, maximum: int) -> bytes:
    absolute = path.absolute()
    parent_fd = open_directory_chain(absolute.parent)
    fd = -1
    try:
        fd = os.open(absolute.name, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > maximum:
            fail(f"not a bounded regular file: {absolute}")
        result = bytearray()
        while len(result) <= maximum:
            block = os.read(fd, min(1024 * 1024, maximum + 1 - len(result)))
            if not block:
                break
            result.extend(block)
        after = os.fstat(fd)
        if len(result) > maximum or len(result) != before.st_size or (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns):
            fail(f"file changed or exceeded bound while read: {absolute}")
        return bytes(result)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)

def hash_regular(path: Path, maximum: int, algorithm: str = "sha256") -> tuple[str, int]:
    absolute = path.absolute()
    parent_fd = open_directory_chain(absolute.parent)
    fd = -1
    try:
        fd = os.open(absolute.name, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > maximum:
            fail(f"not a bounded regular file: {absolute}")
        digest = hashlib.new(algorithm)
        count = 0
        while True:
            block = os.read(fd, 1024 * 1024)
            if not block:
                break
            count += len(block)
            if count > maximum:
                fail(f"file exceeds hash bound: {absolute}")
            digest.update(block)
        after = os.fstat(fd)
        if count != before.st_size or (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns):
            fail(f"file changed while hashing: {absolute}")
        return digest.hexdigest(), count
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)

def write_exclusive(path: Path, payload: bytes, mode: int = 0o600) -> None:
    absolute = path.absolute()
    parent_fd = open_directory_chain(absolute.parent)
    fd = -1
    try:
        fd = os.open(absolute.name, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), mode, dir_fd=parent_fd)
        view = memoryview(payload)
        while view:
            count = os.write(fd, view)
            if count <= 0:
                fail(f"short evidence write: {absolute}")
            view = view[count:]
        os.fchmod(fd, mode)
        os.fsync(fd)
        os.fsync(parent_fd)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(parent_fd)


def load_lock() -> dict[str, Any]:
    value = json.loads(safe_read(LOCK, 1024 * 1024))
    if type(value) is not dict or value.get("schema") != "offline-proof-backend-lock-v1" or value.get("operator_execution") != "DENY":
        fail("backend lock schema/policy invalid")
    return value


def verify_private_dir(path: Path) -> None:
    info = path.lstat()
    if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
        fail(f"expected owner-only 0700 directory: {path}")


def check_storage() -> None:
    storage_fd = open_directory_chain(STORAGE)
    os.close(storage_fd)
    verify_private_dir(STORAGE)
    for name in ("bin", "cache", "build", "images", "runs", "ledger"):
        verify_private_dir(STORAGE / name)

def strict_json(raw: bytes, label: str) -> dict[str, Any]:
    def pairs(items: list[tuple[str, Any]]) -> dict[str, Any]:
        out: dict[str, Any] = {}
        for key, value in items:
            if key in out:
                fail(f"duplicate key in {label}: {key}")
            out[key] = value
        return out
    try:
        value = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise LaunchError(f"invalid {label} JSON") from exc
    if type(value) is not dict:
        fail(f"{label} must be a JSON object")
    return value

def verify_sha512_sum_entry(raw: bytes, filename: str, expected: str) -> None:
    try:
        lines = raw.decode("ascii", "strict").splitlines()
    except UnicodeDecodeError as exc:
        raise LaunchError("Debian SHA512SUMS is not ASCII") from exc
    matches = [line.split()[0].lower() for line in lines if len(line.split()) >= 2 and line.split()[-1].lstrip("*") == filename]
    if matches != [expected]:
        fail("published Debian checksum entry is absent, duplicated or mismatched")


def campaign_usage() -> int:
    maximum = 64 * 1024 * 1024 * 1024
    total = 0
    stack = [STORAGE]
    while stack:
        directory = stack.pop()
        with os.scandir(directory) as entries:
            for entry in entries:
                item = Path(entry.path)
                info = entry.stat(follow_symlinks=False)
                if stat.S_ISLNK(info.st_mode):
                    fail("campaign storage contains a symbolic link")
                if stat.S_ISDIR(info.st_mode):
                    if info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o700:
                        fail("campaign storage contains a non-private directory")
                    stack.append(item)
                elif stat.S_ISREG(info.st_mode):
                    if info.st_uid != os.getuid() or info.st_nlink != 1 or stat.S_IMODE(info.st_mode) & 0o077:
                        fail("campaign storage contains a foreign, linked or non-private file")
                    total += info.st_size
                elif stat.S_ISSOCK(info.st_mode):
                    relative = item.relative_to(STORAGE).parts
                    if len(relative) != 4 or relative[0] != "runs" or not RUN_ID_RE.fullmatch(relative[1]) or relative[2:] != ("host", "vfkit.sock") or info.st_uid != os.getuid():
                        fail("campaign storage contains an unexpected socket")
                else:
                    fail("campaign storage contains a non-regular evidence object")
                if total > maximum:
                    fail("campaign logical storage exceeds the approved 64 GiB cap")
    return total


FIXTURE_EVIDENCE_RESERVATION = 256 * 1024 * 1024


def fixture_capacity_reservation() -> int:
    descriptor = strict_json(safe_read(STORAGE / "images/runtime-descriptor.json", 1024 * 1024), "runtime descriptor")
    sectors = descriptor.get("root_partition_sectors")
    if type(sectors) is not int or sectors < 1:
        fail("prepared root partition size is unavailable for fixture capacity admission")
    view_raw = safe_read(STORAGE / "ledger/target-view.json", 16 * 1024 * 1024)
    return fixture_runtime_input_bytes(sectors * 512, len(view_raw)) + FIXTURE_EVIDENCE_RESERVATION

def reserve_campaign_capacity(kind: str, *, additional_needed: int = 0) -> None:
    needed = (8 * 1024 * 1024 * 1024 if kind == "preparation" else 4 * 1024 * 1024 * 1024 if kind == "fixture" else 64 * 1024 * 1024) + additional_needed
    used = campaign_usage()
    if needed < 0 or used + needed > 64 * 1024 * 1024 * 1024:
        fail("campaign has insufficient remaining logical capacity for this one-shot start")
    free = shutil.disk_usage(STORAGE).free
    if free < needed + 64 * 1024 * 1024:
        fail("filesystem lacks physical room for the next single-use bounded phase")


def verify_manifest_storage_path(path: Path) -> None:
    absolute = path.absolute()
    build = STORAGE / "build"
    try:
        relative = absolute.relative_to(build)
    except ValueError:
        fail("manifest must reside inside the protected campaign build tree")
    if len(relative.parts) != 2 or not RUN_ID_RE.fullmatch(relative.parts[0]) or relative.name != "manifest.json":
        fail("manifest must be manifest.json within a unique UUID-named private build child")
    verify_private_dir(build)
    verify_private_dir(build / relative.parts[0])
    verify_private_dir(build / relative.parts[0] / "closure")
    info = absolute.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o400:
        fail("manifest must be an owner-only immutable regular file")
def _manifest_rows(value: Any, label: str) -> list[dict[str, Any]]:
    if type(value) is not list:
        fail(f"manifest {label} must be an array")
    rows: list[dict[str, Any]] = []
    seen: set[str] = set()
    allowed_classes = {"operator-source-inert", "contract", "review", "adapter-source-inert", "assembler-source-inert", "binding", "inventory", "grader", "native-manifest", "packet"}
    for row in value:
        if type(row) is not dict or set(row) != {"path", "bytes", "sha256", "class"}:
            fail(f"manifest {label} contains an invalid file row")
        path = row["path"]
        if type(path) is not str or not re.fullmatch(r"[A-Za-z0-9._/-]+", path) or path.startswith("/") or any(part in {"", ".", ".."} for part in path.split("/")):
            fail(f"manifest {label} contains an unsafe relative path")
        if path in seen or type(row["bytes"]) is not int or row["bytes"] < 0 or type(row["sha256"]) is not str or not re.fullmatch(r"[0-9a-f]{64}", row["sha256"]) or type(row["class"]) is not str or row["class"] not in allowed_classes:
            fail(f"manifest {label} contains a duplicate or malformed file identity")
        seen.add(path)
        rows.append(row)
    return rows


SOURCE_MAP_CLASSES = {"operator-source-inert", "contract", "review", "adapter-source-inert", "assembler-source-inert", "binding", "inventory", "grader", "native-manifest", "packet"}


def validate_source_map_file(raw: bytes, *, expected_raw_sha256: str, plan_sha256: str) -> list[dict[str, Any]]:
    if type(expected_raw_sha256) is not str or not re.fullmatch(r"[0-9a-f]{64}", expected_raw_sha256) or sha256(raw) != expected_raw_sha256:
        fail("source map differs from the independently acknowledged raw digest")
    value = strict_json(raw, "independent frozen source map")
    if type(value) is not dict or set(value) != {"schema", "phase", "approved_plan_sha256", "files"} or value.get("schema") != "offline-proof-source-map-v1" or value.get("phase") != "preparation" or value.get("approved_plan_sha256") != plan_sha256 or type(value.get("files")) is not list:
        fail("independent source-map schema/phase/plan contract mismatch")
    rows = value["files"]
    previous = ""
    seen: set[str] = set()
    for row in rows:
        if type(row) is not dict or set(row) != {"path", "class", "bytes", "sha256"}:
            fail("independent source-map row shape mismatch")
        path = row["path"]
        if type(path) is not str or not re.fullmatch(r"[A-Za-z0-9._/-]+", path) or path.startswith("/") or any(part in {"", ".", ".."} for part in path.split("/")) or path == "authority/source-map.json":
            fail("independent source-map path is unsafe")
        if path in seen or path <= previous or type(row["class"]) is not str or row["class"] not in SOURCE_MAP_CLASSES or type(row["bytes"]) is not int or row["bytes"] < 0 or type(row["sha256"]) is not str or not re.fullmatch(r"[0-9a-f]{64}", row["sha256"]):
            fail("independent source-map row order, identity or types invalid")
        seen.add(path)
        previous = path
    return rows


def verify_manifest(path: Path, lock: dict[str, Any], *, expected_source_map_sha256: str) -> dict[str, Any]:
    raw = safe_read(path, 64 * 1024 * 1024)
    manifest = strict_json(raw, "manifest")
    required = {"schema", "approved_plan_sha256", "source_pins", "packet_inventory", "source_files", "packet_files", "grader_files", "native_manifest", "source_map", "guest_runtime", "execution_policy", "manifest_sha256"}
    if set(manifest) != required or manifest.get("schema") != "offline-proof-manifest-v1" or manifest.get("approved_plan_sha256") != lock["approved_plan_sha256"]:
        fail("manifest plan/schema mismatch")
    body = dict(manifest)
    supplied = body.pop("manifest_sha256", None)
    actual = sha256(canonical(body))
    if supplied != actual:
        fail("manifest content digest mismatch")
    pins = manifest.get("source_pins")
    if type(pins) is not dict or set(pins) != {"operator_sha256", "collector_report_sha256", "assembler_sha256", "adapter_sha256", "native_entry_sha256", "candidate_sha256", "renewal_sha256", "contract_sha256"} or any(type(value) is not str or not re.fullmatch(r"[0-9a-f]{64}", value) for value in pins.values()):
        fail("manifest source pin set is incomplete or malformed")
    if pins["operator_sha256"] != lock["source_pins"]["operator_sha256"] or pins["collector_report_sha256"] != lock["source_pins"]["collector_report_sha256"]:
        fail("manifest O/R source pins differ from the approved plan")
    inventory = manifest.get("packet_inventory")
    if type(inventory) is not dict or inventory != {"path": "analysis/packet-inventory.json", "staged_path": ".superpowers/sdd/2026-10-11-system-design-professionalization/t8-packets/prepared-78304406-ccdd-43d8-b5ec-69e76321de02/analysis/packet-inventory.json", "sha256": inventory.get("sha256"), "inventory_sha256": inventory.get("inventory_sha256"), "package_count": 114, "native_count": 349, "total_count": 463} or any(type(inventory.get(key)) is not str or not re.fullmatch(r"[0-9a-f]{64}", inventory[key]) for key in ("sha256", "inventory_sha256")):
        fail("manifest packet inventory contract is incomplete")
    source_rows = _manifest_rows(manifest.get("source_files"), "source_files")
    inventory_rows = [row for row in source_rows if row["path"] == inventory["staged_path"]]
    if len(inventory_rows) != 1 or inventory_rows[0]["class"] != "inventory" or inventory_rows[0]["sha256"] != inventory["sha256"]:
        fail("manifest inventory metadata does not bind exactly one staged source row")
    packet_rows = _manifest_rows(manifest.get("packet_files"), "packet_files")
    grader_rows = _manifest_rows(manifest.get("grader_files"), "grader_files")
    native_row = manifest.get("native_manifest")
    if type(native_row) is not dict or len(_manifest_rows([native_row], "native_manifest")) != 1 or native_row["class"] != "native-manifest":
        fail("manifest native manifest identity is malformed")
    if len(packet_rows) != 463 or any(row["class"] != "packet" for row in packet_rows):
        fail("manifest does not bind all 463 frozen packet files")
    if not source_rows or not grader_rows:
        fail("manifest source/grader closure is empty")
    source_map_record = manifest.get("source_map")
    if type(source_map_record) is not dict or set(source_map_record) != {"path", "raw_sha256", "phase_context"} or source_map_record.get("path") != "authority/source-map.json" or source_map_record.get("raw_sha256") != expected_source_map_sha256 or source_map_record.get("phase_context") != {"phase": "preparation", "approved_plan_sha256": lock["approved_plan_sha256"]}:
        fail("manifest source-map descriptor is not bound to the independent release pin")
    source_map_raw = safe_read(path.parent / "closure/authority/source-map.json", 64 * 1024 * 1024)
    source_map_rows = validate_source_map_file(source_map_raw, expected_raw_sha256=expected_source_map_sha256, plan_sha256=lock["approved_plan_sha256"])
    manifest_rows = sorted(source_rows + packet_rows + grader_rows + [native_row], key=lambda row: row["path"])
    expected_map_rows = [{"path": row["path"], "class": row["class"], "bytes": row["bytes"], "sha256": row["sha256"]} for row in manifest_rows]
    if source_map_rows != expected_map_rows:
        fail("manifest closure membership or identities differ from the independently pinned source map")
    for row in manifest_rows:
        staged = safe_read(path.parent / "closure" / row["path"], row["bytes"])
        if len(staged) != row["bytes"] or sha256(staged) != row["sha256"]:
            fail(f"staged file bytes differ from the externally approved map: {row['path']}")
    if sha256(source_map_raw) != source_map_record["raw_sha256"]:
        fail("staged source-map bytes changed after producer validation")
    runtime = manifest.get("guest_runtime")
    if type(runtime) is not dict or runtime.get("architecture") != "aarch64" or runtime.get("kernel_release") != "6.12.113-1" or runtime.get("python") != lock["guest_packages"]["python3.13"] or runtime.get("libseccomp") != lock["guest_packages"]["libseccomp2"] or runtime.get("ext4_tools") != lock["guest_packages"]["e2fsprogs"] or type(runtime.get("rootfs_sha512")) is not str or runtime["rootfs_sha512"] != lock["assets"]["debian"]["raw_image_sha512"] or not re.fullmatch(r"[0-9a-f]{128}", runtime["rootfs_sha512"]):
        fail("manifest guest runtime identity is incomplete or not pinned")
    package_versions = runtime.get("package_versions")
    if type(package_versions) is not dict or set(package_versions) != set(lock["guest_packages"]) or any(package_versions.get(name) != version for name, version in lock["guest_packages"].items()):
        fail("manifest guest package closure differs from the approved lock")
    policy = manifest.get("execution_policy")
    if type(policy) is not dict or policy != {"operator_execution": "DENY", "permitted_target": "harmless-fixture.py", "host_shares": False, "guest_network": False, "vsock": False, "rosetta": False, "gpu": False, "cgroup_pids_max": 3, "target_control_fd": False, "automatic_retry": False}:
        fail("manifest execution policy missing or widened")
    return manifest


def verify_project_pins(lock: dict[str, Any]) -> None:
    base = REPO / ".superpowers/sdd/2026-10-11-system-design-professionalization"
    expected = (
        (base / "g2-instrumented-operator/operator.py", lock["source_pins"]["operator_sha256"], 1024 * 1024 * 1024),
        (base / "qf5-collector-report.md", lock["source_pins"]["collector_report_sha256"], 64 * 1024 * 1024),
    )
    for path, wanted, maximum in expected:
        if sha256(safe_read(path, maximum)) != wanted:
            fail(f"frozen source changed after approved plan: {path.name}")


def verify_preflight(lock: dict[str, Any]) -> str:
    path = STORAGE / "ledger/preflight.json"
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o400:
        fail("preflight receipt must be an owner-only immutable regular file")
    raw = safe_read(path, 1024 * 1024)
    receipt = strict_json(raw, "preflight receipt")
    required = {"schema", "plan_sha256", "host_python", "storage", "vfkit_sha256", "vfkit_signature_sha256", "acquisition_sha256", "debian_archive_sha512", "debian_raw_sha512", "vm_started"}
    if set(receipt) != required or receipt.get("schema") != "offline-proof-preflight-v1" or receipt.get("plan_sha256") != lock["approved_plan_sha256"] or receipt.get("vm_started") is not False:
        fail("preflight receipt schema, plan or no-VM claim mismatch")
    host = receipt.get("host_python")
    if type(host) is not dict or set(host) != {"sys_executable", "resolved_executable", "python_version", "machine", "executable_sha256", "isolation_mode_required", "target_execution"}:
        fail("preflight host Python identity shape mismatch")
    executable = Path(sys.executable).resolve(strict=True)
    executable_sha, _ = hash_regular(executable, 512 * 1024 * 1024)
    if host != {"sys_executable": sys.executable, "resolved_executable": str(executable), "python_version": sys.version.split()[0], "machine": platform.machine(), "executable_sha256": executable_sha, "isolation_mode_required": "python -I -S -B", "target_execution": "launcher files only"} or platform.system() != "Darwin" or platform.machine() not in {"arm64", "aarch64"}:
        fail("preflight host runtime differs from the current pinned launcher interpreter")
    storage_receipt = receipt.get("storage")
    storage_keys = {"path", "owner_uid", "mode", "logical_bytes", "free_bytes", "total_bytes"}
    if type(storage_receipt) is not dict or set(storage_receipt) != storage_keys or storage_receipt.get("path") != str(STORAGE) or storage_receipt.get("owner_uid") != os.getuid() or storage_receipt.get("mode") != "0700" or any(type(storage_receipt.get(key)) is not int or storage_receipt[key] < 0 for key in ("logical_bytes", "free_bytes", "total_bytes")) or storage_receipt["logical_bytes"] > lock["storage"]["campaign_logical_bytes_max"]:
        fail("preflight receipt storage identity/shape mismatch")
    assets = lock["assets"]
    vfkit = STORAGE / "bin/vfkit"
    vf_sha, vf_bytes = hash_regular(vfkit, assets["vfkit"]["max_download_bytes"])
    if vf_sha != assets["vfkit"]["sha256"] or receipt.get("vfkit_sha256") != vf_sha:
        fail("preflight vfkit bytes differ from the pinned official binary")
    archive = STORAGE / "cache/debian.tar.xz"
    archive_sha, archive_bytes = hash_regular(archive, assets["debian"]["max_archive_bytes"], "sha512")
    archive_sha256, _ = hash_regular(archive, assets["debian"]["max_archive_bytes"])
    raw_image = STORAGE / "images/debian/debian-13-generic-arm64.raw"
    raw_sha, raw_bytes = hash_regular(raw_image, assets["debian"]["max_expanded_bytes"], "sha512")
    if archive_sha != assets["debian"]["archive_sha512"] or raw_sha != assets["debian"]["raw_image_sha512"] or receipt.get("debian_archive_sha512") != archive_sha or receipt.get("debian_raw_sha512") != raw_sha:
        fail("preflight Debian archive/raw image bytes differ from the official locked digests")
    signature_raw = safe_read(STORAGE / "ledger/vfkit-signature.json", 1024 * 1024)
    signature = strict_json(signature_raw, "vfkit signature receipt")
    signature_keys = {"binary_sha256", "codesign_verify_stdout", "codesign_verify_stderr", "entitlements", "checked_at_unix", "vm_started"}
    if sha256(signature_raw) != receipt.get("vfkit_signature_sha256") or type(signature) is not dict or set(signature) != signature_keys:
        fail("vfkit signature receipt bytes or schema mismatch")
    signature_stdout = signature.get("codesign_verify_stdout")
    signature_stderr = signature.get("codesign_verify_stderr")
    entitlements = signature.get("entitlements")
    if type(signature_stdout) is not str or type(signature_stderr) is not str or len(signature_stdout.encode("utf-8")) + len(signature_stderr.encode("utf-8")) > 256 * 1024 or type(signature.get("checked_at_unix")) is not int or signature["checked_at_unix"] < 0 or type(entitlements) is not dict or signature.get("binary_sha256") != vf_sha or entitlements.get("com.apple.security.virtualization") is not True or signature.get("vm_started") is not False:
        fail("vfkit code-signature/virtualization-entitlement receipt mismatch")
    acquisition_raw = safe_read(STORAGE / "ledger/acquisition.json", 4 * 1024 * 1024)
    acquisition = strict_json(acquisition_raw, "acquisition receipt")
    if sha256(acquisition_raw) != receipt.get("acquisition_sha256"):
        fail("acquisition receipt bytes differ from the independently pinned preflight digest")
    acquisition_keys = {"schema", "plan_sha256", "assets", "debian_image_identity", "locked_guest_package_versions", "vfkit_signature", "network_policy", "vm_started"}
    asset_keys = {"vfkit_release_metadata", "vfkit", "debian_metadata", "debian_sums", "debian_archive", "debian_raw"}
    if set(acquisition) != acquisition_keys or acquisition.get("schema") != "offline-proof-acquisition-v1" or acquisition.get("plan_sha256") != lock["approved_plan_sha256"] or acquisition.get("vm_started") is not False or type(acquisition.get("assets")) is not dict or set(acquisition["assets"]) != asset_keys:
        fail("acquisition receipt schema or asset closure mismatch")
    expected_urls = {
        "vfkit_release_metadata": assets["vfkit"]["release_metadata_url"],
        "vfkit": assets["vfkit"]["download_url"],
        "debian_metadata": assets["debian"]["package_inventory_url"],
        "debian_sums": assets["debian"]["checksums_url"],
        "debian_archive": assets["debian"]["archive_url"],
    }
    allowed_hosts = {
        "vfkit_release_metadata": assets["vfkit"]["allowed_hosts"],
        "vfkit": assets["vfkit"]["allowed_hosts"],
        "debian_metadata": assets["debian"]["allowed_hosts"],
        "debian_sums": assets["debian"]["allowed_hosts"],
        "debian_archive": assets["debian"]["allowed_hosts"],
    }
    for name, url in expected_urls.items():
        item = acquisition["assets"][name]
        if type(item) is not dict or set(item) != {"url", "final_url", "bytes", "sha256", "content_type", "tls", "proxy", "retry"} or item.get("url") != url or item.get("retry") is not False or item.get("proxy") != "disabled" or item.get("tls") != "default certificate verification":
            fail(f"acquisition source receipt is not pinned for {name}")
        final = urlsplit(item.get("final_url", ""))
        if final.scheme != "https" or final.username or final.password or final.port not in (None, 443) or final.fragment or (final.hostname or "").lower() not in {host.lower() for host in allowed_hosts[name]}:
            fail(f"acquisition final URL escaped the pinned HTTPS host set for {name}")
        if type(item.get("bytes")) is not int or item["bytes"] <= 0 or type(item.get("sha256")) is not str or not re.fullmatch(r"[0-9a-f]{64}", item["sha256"]):
            fail(f"acquisition digest receipt malformed for {name}")
    metadata_raw = safe_read(STORAGE / "cache/vfkit-release.json", 8 * 1024 * 1024)
    metadata = strict_json(metadata_raw, "vfkit release metadata")
    if sha256(metadata_raw) != acquisition["assets"]["vfkit_release_metadata"]["sha256"] or len(metadata_raw) != acquisition["assets"]["vfkit_release_metadata"]["bytes"] or metadata.get("tag_name") != f"v{assets['vfkit']['version']}":
        fail("vfkit release metadata changed or has the wrong tag")
    if acquisition["assets"]["vfkit"].get("sha256") != vf_sha or acquisition["assets"]["vfkit"].get("bytes") != vf_bytes:
        fail("vfkit acquisition digest/size differs from the locked binary")
    vf_rows = [row for row in metadata.get("assets", []) if type(row) is dict and row.get("id") == assets["vfkit"]["asset_id"]]
    if len(vf_rows) != 1 or vf_rows[0].get("name") != assets["vfkit"]["asset_name"] or vf_rows[0].get("browser_download_url") != assets["vfkit"]["download_url"]:
        fail("vfkit release metadata no longer identifies the pinned asset")
    package_raw = safe_read(STORAGE / "cache/debian-image.json", assets["debian"]["max_metadata_bytes"])
    package_meta = strict_json(package_raw, "Debian package inventory")
    if sha256(package_raw) != acquisition["assets"]["debian_metadata"]["sha256"] or len(package_raw) != acquisition["assets"]["debian_metadata"]["bytes"]:
        fail("Debian package inventory changed after acquisition")
    try:
        _, package_rows = debian_build_metadata(package_meta, assets["debian"])
    except DebianMetadataError as exc:
        fail(str(exc))
    package_versions: dict[str, str] = {}
    for item in package_rows:
        if type(item) is not dict or type(item.get("name")) is not str or type(item.get("version")) is not str:
            fail("Debian package inventory row is malformed")
        name = item["name"]
        if name in lock["guest_packages"]:
            if name in package_versions:
                fail(f"Debian package inventory duplicates locked package: {name}")
            package_versions[name] = item["version"]
    if any(package_versions.get(name) != version for name, version in lock["guest_packages"].items()):
        fail("Debian package inventory versions differ from the fixed guest lock")
    sums = safe_read(STORAGE / "cache/debian-SHA512SUMS", assets["debian"]["max_metadata_bytes"])
    if sha256(sums) != acquisition["assets"]["debian_sums"]["sha256"] or len(sums) != acquisition["assets"]["debian_sums"]["bytes"]:
        fail("Debian SHA512SUMS changed after acquisition")
    verify_sha512_sum_entry(sums, debian_archive_basename(assets["debian"]), assets["debian"]["archive_sha512"])
    archive_record = acquisition["assets"]["debian_archive"]
    raw_record = acquisition["assets"]["debian_raw"]
    if type(archive_record) is not dict or set(archive_record) != {"url", "final_url", "bytes", "sha256", "content_type", "tls", "proxy", "retry"} or archive_record.get("sha256") != archive_sha256 or archive_record.get("bytes") != archive_bytes:
        fail("Debian archive acquisition record differs from current official bytes")
    try:
        validate_extraction_record(raw_record, archive_sha512=archive_sha, raw_sha512=raw_sha, raw_bytes=raw_bytes, extracted_path=str(raw_image))
    except DebianMetadataError as exc:
        fail(str(exc))
    acquired_signature = acquisition.get("vfkit_signature")
    if type(acquired_signature) is not dict or set(acquired_signature) != {"binary_sha256", "virtualization_entitlement"} or acquisition.get("locked_guest_package_versions") != lock["guest_packages"] or acquired_signature.get("binary_sha256") != vf_sha or acquired_signature.get("virtualization_entitlement") is not True or acquisition.get("network_policy") != "HTTPS only; proxy disabled; exact official host allowlist; no credentials; no retries/fallback":
        fail("acquisition receipt package/signature/network identities differ from lock")
    return sha256(raw)

def _release(path: Path, digest_arg: str, manifest: dict[str, Any] | None, kind: str, case_id: str) -> dict[str, Any]:
    expected_path = STORAGE / "ledger/controller-release.json"
    if path.absolute() != expected_path:
        fail("controller release must be the single fixed external ledger record")
    info = path.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600:
        fail("controller release must be an owner-only 0600 regular file")
    raw = safe_read(path, 1024 * 1024)
    if sha256(raw) != digest_arg:
        fail("controller release digest differs from explicit CLI acknowledgement")
    release = strict_json(raw, "controller release")
    required = {"schema", "status", "approved_plan_sha256", "manifest_sha256", "source_map_sha256", "target_view_sha256", "static_review_sha256", "launcher_sha256", "issued_at", "expires_at", "authorized_preparation_starts", "authorized_fixture_ids", "authorized_inspection_ids", "operator_execution", "release_nonce"}
    if set(release) != required or release.get("schema") != "offline-proof-controller-release-v1" or release.get("status") != "APPROVED":
        fail("controller release schema or status invalid")
    now = int(time.time())
    if type(release.get("issued_at")) is not int or type(release.get("expires_at")) is not int or not release["issued_at"] <= now < release["expires_at"]:
        fail("controller release is not currently valid")
    if type(release["source_map_sha256"]) is not str or not re.fullmatch(r"[0-9a-f]{64}", release["source_map_sha256"]) or release["operator_execution"] != "DENY":
        fail("controller release lacks the independent frozen source-map pin or operator denial")
    if release["target_view_sha256"] is not None and (type(release["target_view_sha256"]) is not str or not re.fullmatch(r"[0-9a-f]{64}", release["target_view_sha256"])):
        fail("controller release target-view pin is malformed")
    if kind == "fixture" and release["target_view_sha256"] is None:
        fail("fixture activation requires an independently approved target-view map digest")
    if manifest is not None and (release["approved_plan_sha256"] != manifest["approved_plan_sha256"] or release["manifest_sha256"] != manifest["manifest_sha256"]):
        fail("controller release is not bound to current plan/manifest")
    if type(release["static_review_sha256"]) is not str or not re.fullmatch(r"[0-9a-f]{64}", release["static_review_sha256"]) or type(release["launcher_sha256"]) is not str or not re.fullmatch(r"[0-9a-f]{64}", release["launcher_sha256"]):
        fail("controller release lacks valid reviewer/launcher SHA-256 pins")
    review_info = STATIC_REVIEW.lstat()
    if not stat.S_ISREG(review_info.st_mode) or stat.S_ISLNK(review_info.st_mode) or review_info.st_uid != os.getuid() or stat.S_IMODE(review_info.st_mode) != 0o400:
        fail("independent static-review artifact is absent or not an owner-only immutable file")
    if sha256(safe_read(STATIC_REVIEW, 16 * 1024 * 1024)) != release["static_review_sha256"]:
        fail("controller release static-review digest differs from the independent artifact")
    if type(release["release_nonce"]) is not str or not release["release_nonce"]:
        fail("controller release nonce missing")
    fixtures = release["authorized_fixture_ids"]
    inspections = release["authorized_inspection_ids"]
    if type(release["authorized_preparation_starts"]) is not int or release["authorized_preparation_starts"] != 1:
        fail("controller release must authorize exactly one preparation start")
    if type(fixtures) is not list or len(fixtures) > 8 or any(type(item) is not str or item not in FIXTURE_IDS for item in fixtures) or len(set(fixtures)) != len(fixtures):
        fail("controller fixture release must be a unique subset of the eight fixed IDs")
    if type(inspections) is not list or len(inspections) > 2 or any(type(item) is not str or item not in INSPECTION_IDS for item in inspections) or len(set(inspections)) != len(inspections):
        fail("controller inspection release must be a unique subset of the two fixed IDs")
    if kind == "preparation" and release["authorized_preparation_starts"] != 1:
        fail("controller release does not authorize the one preparation start")
    if kind == "fixture" and case_id not in fixtures:
        fail("controller release does not authorize this exact fixture")
    if kind == "inspection" and case_id not in inspections:
        fail("controller release does not authorize this exact inspection")
    return release


def current_launcher_digest() -> str:
    names = ("backend.lock.json", "manifest.schema.json", "prepare-manifest.py", "provision.py", "launch.py", "protocol.py", "debian_contract.py", "guest-supervisor.py", "bootstrap.py", "policy.json", "harmless-fixture.py")
    h = hashlib.sha256()
    for name in names:
        data = safe_read(HERE / name, 32 * 1024 * 1024)
        h.update(name.encode("ascii") + b"\x00" + len(data).to_bytes(8, "big") + data)
    return h.hexdigest()


def create_run_dir(run_id: str) -> Path:
    if not RUN_ID_RE.fullmatch(run_id):
        fail("run id must be a canonical UUID")
    run = STORAGE / "runs" / run_id
    run.mkdir(mode=0o700, exist_ok=False)
    os.chmod(run, 0o700)
    verify_private_dir(run)
    for name in ("evidence", "host", "scratch"):
        (run / name).mkdir(mode=0o700, exist_ok=False)
    return run


def claim_start(kind: str, case_id: str, run_id: str, release_sha: str) -> Path:
    claim = STORAGE / "ledger" / f"start-{kind}-{case_id}.json"
    payload = canonical({"schema": "offline-proof-start-claim-v1", "kind": kind, "case_id": case_id, "run_id": run_id, "controller_release_sha256": release_sha, "claimed_unix": int(time.time()), "automatic_retry": False}) + b"\n"
    write_exclusive(claim, payload, 0o400)
    return claim

def verify_h8_claim_replay_refusal(case_id: str, run_id: str, release_sha: str) -> dict[str, Any]:
    claim_path = STORAGE / "ledger" / f"start-fixture-{case_id}.json"
    claim_info = claim_path.lstat()
    if not stat.S_ISREG(claim_info.st_mode) or stat.S_ISLNK(claim_info.st_mode) or claim_info.st_uid != os.getuid() or claim_info.st_nlink != 1 or stat.S_IMODE(claim_info.st_mode) != 0o400:
        fail("H8 original host claim is not owner-only immutable evidence")
    before = safe_read(claim_path, 1024 * 1024)
    after_read_info = claim_path.lstat()
    if not stat.S_ISREG(after_read_info.st_mode) or stat.S_ISLNK(after_read_info.st_mode) or after_read_info.st_uid != os.getuid() or after_read_info.st_nlink != 1 or stat.S_IMODE(after_read_info.st_mode) != 0o400 or (claim_info.st_dev, claim_info.st_ino, claim_info.st_size, claim_info.st_mtime_ns) != (after_read_info.st_dev, after_read_info.st_ino, after_read_info.st_size, after_read_info.st_mtime_ns):
        fail("H8 original host claim changed during evidence read")
    prior = strict_json(before, "H8 original host start claim")
    if type(prior) is not dict or set(prior) != {"schema", "kind", "case_id", "run_id", "controller_release_sha256", "claimed_unix", "automatic_retry"} or prior.get("schema") != "offline-proof-start-claim-v1" or prior.get("kind") != "fixture" or prior.get("case_id") != case_id or prior.get("run_id") != run_id or prior.get("controller_release_sha256") != release_sha or type(prior.get("claimed_unix")) is not int or prior.get("automatic_retry") is not False:
        fail("H8 original host start claim does not bind the current one-shot activation")
    competitor_run_id = str(uuid.uuid4())
    try:
        claim_start("fixture", case_id, competitor_run_id, release_sha)
    except FileExistsError:
        after = safe_read(claim_path, 1024 * 1024)
        if after != before:
            fail("H8 refused host replay changed the original one-shot claim bytes")
        after_info = claim_path.lstat()
        if not stat.S_ISREG(after_info.st_mode) or stat.S_ISLNK(after_info.st_mode) or after_info.st_uid != os.getuid() or after_info.st_nlink != 1 or stat.S_IMODE(after_info.st_mode) != 0o400 or (claim_info.st_dev, claim_info.st_ino, claim_info.st_size, claim_info.st_mtime_ns) != (after_info.st_dev, after_info.st_ino, after_info.st_size, after_info.st_mtime_ns):
            fail("H8 host replay changed the original claim identity or protection")
        return {"schema": "offline-proof-host-claim-replay-v1", "original_run_id": run_id, "competing_run_id": competitor_run_id, "refusal": "exclusive-claim-already-exists", "original_claim_sha256": sha256(before), "retained_claim_sha256": sha256(after), "original_claim_unchanged": True}
    fail("H8 competing host claim unexpectedly created a second activation claim")


def copy_exclusive(source: Path, destination: Path, max_bytes: int, expected_sha512: str) -> None:
    info = source.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != os.getuid() or info.st_nlink != 1 or stat.S_IMODE(info.st_mode) != 0o400 or info.st_size <= 0 or info.st_size > max_bytes:
        fail(f"source image is not a bounded sealed regular file: {source}")
    src = os.open(source, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    dst = -1
    try:
        dst = os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
        before = os.fstat(src)
        if (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (info.st_dev, info.st_ino, info.st_size, info.st_mtime_ns):
            fail("source image changed identity before copy")
        h = hashlib.sha512()
        copied = 0
        while True:
            block = os.read(src, CHUNK)
            if not block:
                break
            copied += len(block)
            if copied > max_bytes:
                fail("source image grew beyond approved size")
            h.update(block)
            view = memoryview(block)
            while view:
                count = os.write(dst, view)
                if count <= 0:
                    fail("short raw image copy")
                view = view[count:]
        after = os.fstat(src)
        if copied != before.st_size or (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) or h.hexdigest() != expected_sha512:
            fail("source image changed or differs from the locked SHA-512 while copying")
        os.fchmod(dst, 0o600)
        os.fsync(dst)
        destination_parent_fd = open_directory_chain(destination.parent)
        try:
            os.fsync(destination_parent_fd)
        finally:
            os.close(destination_parent_fd)
    finally:
        os.close(src)
        if dst >= 0:
            os.close(dst)


def cloud_init_user_data(manifest: dict[str, Any], manifest_path: Path, closure_root: Path, run_id: str) -> bytes:
    manifest_raw = safe_read(manifest_path, 64 * 1024 * 1024)
    staged_manifest = strict_json(manifest_raw, "staged manifest")
    if staged_manifest != manifest or staged_manifest.get("manifest_sha256") != manifest.get("manifest_sha256"):
        fail("manifest bytes changed after validation and before guest staging")
    entries: list[tuple[str, bytes, str]] = [("/opt/offline-proof/manifest.json", manifest_raw, "0400")]
    source_map_record = manifest["source_map"]
    source_map_path = safe_relative_map_path = PurePosixPath(source_map_record["path"])
    if safe_relative_map_path.is_absolute() or any(part in {"", ".", ".."} for part in safe_relative_map_path.parts):
        fail("manifest source-map path is unsafe")
    source_map_raw = safe_read(closure_root.joinpath(*safe_relative_map_path.parts), 64 * 1024 * 1024)
    if sha256(source_map_raw) != source_map_record["raw_sha256"]:
        fail("independently pinned source-map bytes changed before guest staging")
    entries.append(("/opt/offline-proof/source-map.json", source_map_raw, "0400"))
    rows = manifest.get("source_files", []) + manifest.get("packet_files", []) + manifest.get("grader_files", []) + [manifest.get("native_manifest")]
    launcher_prefix = ".superpowers/sdd/2026-10-11-system-design-professionalization/t8-lane-runner/offline-proof-launcher/"
    launcher_copies: dict[str, bytes] = {}
    for row in rows:
        relative = PurePosixPath(row["path"])
        data = safe_read(closure_root.joinpath(*relative.parts), int(row["bytes"]))
        if len(data) != row["bytes"] or sha256(data) != row["sha256"]:
            fail(f"manifest closure changed before cloud-init staging: {row['path']}")
        entries.append(("/opt/offline-proof/closure/" + relative.as_posix(), data, "0400"))
        if row["path"].startswith(launcher_prefix):
            name = row["path"][len(launcher_prefix):]
            if "/" not in name:
                if name in launcher_copies:
                    fail(f"duplicate staged launcher basename: {name}")
                launcher_copies[name] = data
    required = {"bootstrap.py", "guest-supervisor.py", "harmless-fixture.py", "policy.json"}
    if not required.issubset(launcher_copies):
        fail("manifest closure is missing a guest controller component")
    for name in sorted(required):
        entries.append((f"/opt/offline-proof/{name}", launcher_copies[name], "0400"))
    entries.extend((
        ("/opt/offline-proof/sentinel.txt", b"SYNTHETIC-READ-DENIAL-SENTINEL-v1\n", "0400"),
        ("/opt/offline-proof/init", b"#!/bin/sh\nexec /usr/bin/python3.13 -I -S -B /opt/offline-proof/guest-supervisor.py proof-init\n", "0500"),
    ))
    supervisor = "/opt/offline-proof/closure/" + launcher_prefix + "guest-supervisor.py"
    content: list[str] = [
        "#cloud-config",
        "network:",
        "  config: disabled",
        "ssh_pwauth: false",
        "ssh_deletekeys: true",
        "disable_root: true",
        "users: []",
        "package_update: false",
        "package_upgrade: false",
        "write_files:",
    ]
    for target, data, mode in entries:
        encoded = base64.b64encode(data).decode("ascii")
        content.extend((f"  - path: {json.dumps(target)}", "    owner: root:root", f"    permissions: '{mode}'", "    encoding: b64", f"    content: {json.dumps(encoded)}"))
    content.extend((
        "runcmd:",
        "  - [ /usr/bin/install, -d, -o, root, -g, root, -m, '0700', /proof ]",
        f"  - [ /usr/bin/python3.13, -I, -S, -B, {json.dumps(supervisor)}, prepare, --run-id, {json.dumps(run_id)}, --manifest-sha256, {json.dumps(manifest['manifest_sha256'])} ]",
    ))
    raw = ("\n".join(content) + "\n").encode("utf-8")
    if len(raw) > 64 * 1024 * 1024:
        fail("local NoCloud user-data exceeds 64 MiB trusted-record bound")
    return raw


def _remaining_socket_timeout(deadline: float | None) -> float:
    if deadline is None:
        return 1.0
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        fail("absolute VM lifecycle deadline expired before REST I/O")
    return min(1.0, remaining)


def rest_request(path: Path, method: str, route: str, body: bytes = b"", *, deadline: float | None = None) -> tuple[int, bytes]:
    if method not in {"GET", "POST"} or route not in {"/vm/state", "/vm/inspect"} or (method == "POST" and route != "/vm/state"):
        fail("vfkit REST request outside documented lifecycle interface")
    sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
    try:
        sock.settimeout(_remaining_socket_timeout(deadline))
        sock.connect(str(path))
        request = f"{method} {route} HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\nContent-Length: {len(body)}\r\nContent-Type: application/json\r\n\r\n".encode("ascii") + body
        sock.settimeout(_remaining_socket_timeout(deadline))
        sock.sendall(request)
        response = bytearray()
        while len(response) <= RECORD_LIMIT:
            sock.settimeout(_remaining_socket_timeout(deadline))
            block = sock.recv(64 * 1024)
            if not block:
                break
            response.extend(block)
        if len(response) > RECORD_LIMIT:
            fail("vfkit REST response exceeds bound")
        if deadline is not None and time.monotonic() > deadline:
            fail("vfkit REST response arrived after the absolute lifecycle deadline")
    finally:
        sock.close()
    head, separator, payload = bytes(response).partition(b"\r\n\r\n")
    if not separator:
        fail("malformed vfkit REST response")
    status_line = head.split(b"\r\n", 1)[0].split()
    if len(status_line) < 2 or not status_line[1].isdigit():
        fail("malformed vfkit REST status")
    return int(status_line[1]), payload


def wait_socket(path: Path, process: subprocess.Popen[bytes], deadline: float) -> None:
    while time.monotonic() < deadline and process.poll() is None:
        if path.exists() and stat.S_ISSOCK(path.lstat().st_mode):
            try:
                status, payload = rest_request(path, "GET", "/vm/state", deadline=deadline)
                if status == 200:
                    return
            except (OSError, LaunchError):
                pass
        time.sleep(0.05)
    if process.poll() is not None:
        fail("vfkit exited before its private REST socket became ready")
    fail("vfkit REST socket did not become ready before deadline")


def stop_vm(sock: Path, process: subprocess.Popen[bytes], hard: bool, deadline: float, persist: Any = None) -> dict[str, Any]:
    response: dict[str, Any] = {
        "requested": True,
        "hard": hard,
        "started_unix": int(time.time()),
        "started_monotonic": time.monotonic(),
        "rest_attempted": False,
        "rest_status": None,
        "rest_error": None,
        "owned_pid_signal": None,
        "signal_unix": None,
        "signal_monotonic": None,
        "reaped": False,
        "reaped_unix": None,
        "reaped_monotonic": None,
        "persistence_error": None,
    }

    def checkpoint(stage: str) -> None:
        if persist is None:
            return
        event = {"stage": stage, "unix": int(time.time()), "monotonic": time.monotonic(), "response": dict(response)}
        try:
            persist(event)
        except (OSError, LaunchError) as exc:
            response["persistence_error"] = f"{type(exc).__name__}: {exc}"[:1024]

    try:
        if process.poll() is None and time.monotonic() < deadline:
            response["rest_attempted"] = True
            checkpoint("rest-request-started")
            try:
                code, _payload = rest_request(sock, "POST", "/vm/state", canonical({"state": "HardStop" if hard else "Stop"}), deadline=deadline)
                response["rest_status"] = code
            except (OSError, LaunchError, TimeoutError) as exc:
                response["rest_error"] = f"{type(exc).__name__}: {exc}"[:1024]
            checkpoint("rest-request-finished")
        if process.poll() is None:
            pid = process.pid
            if type(pid) is not int or pid <= 0:
                response["signal_error"] = "refusing to signal non-positive vfkit PID"
            else:
                remaining = deadline - time.monotonic()
                first_signal = signal.SIGKILL if remaining <= 0 else signal.SIGTERM
                try:
                    os.kill(pid, first_signal)
                    response["owned_pid_signal"] = signal.Signals(first_signal).name
                    response["signal_unix"] = int(time.time())
                    response["signal_monotonic"] = time.monotonic()
                    checkpoint("owned-pid-signal-sent")
                except OSError as exc:
                    response["signal_error"] = f"{type(exc).__name__}: {exc}"[:1024]
                if process.poll() is None and first_signal == signal.SIGTERM:
                    remaining = deadline - time.monotonic()
                    if remaining > 0:
                        try:
                            process.wait(timeout=min(0.5, remaining))
                        except subprocess.TimeoutExpired:
                            pass
                if process.poll() is None and first_signal != signal.SIGKILL:
                    try:
                        os.kill(pid, signal.SIGKILL)
                        response["owned_pid_signal"] = signal.SIGKILL.name
                        response["signal_unix"] = int(time.time())
                        response["signal_monotonic"] = time.monotonic()
                        checkpoint("owned-pid-sigkill-sent")
                    except OSError as exc:
                        response["signal_error"] = f"{type(exc).__name__}: {exc}"[:1024]
        if process.poll() is None:
            try:
                remaining = max(0.0, deadline - time.monotonic())
                process.wait(timeout=min(0.25, remaining))
            except subprocess.TimeoutExpired:
                response["reap_error"] = "owned vfkit process remained unreaped at the absolute lifecycle deadline"
    except (OSError, LaunchError, subprocess.SubprocessError) as exc:
        response["stop_error"] = f"{type(exc).__name__}: {exc}"[:1024]
    response["reaped"] = process.poll() is not None
    response["finished_unix"] = int(time.time())
    response["finished_monotonic"] = time.monotonic()
    response["late"] = response["finished_monotonic"] > deadline
    if response["reaped"]:
        response["reaped_unix"] = response["finished_unix"]
        response["reaped_monotonic"] = response["finished_monotonic"]
    checkpoint("stop-finished")
    return response


class SerialFrameScanner:
    def __init__(self, run_id: str, on_frame: Any) -> None:
        self.run_id = run_id
        self.on_frame = on_frame
        self.preamble = bytearray()
        self.decoder: FrameDecoder | None = None
        self.prefix_bytes = 0
        self.frame_count = 0

    def feed(self, data: bytes) -> None:
        if self.decoder is None:
            self.preamble.extend(data)
            marker = self.preamble.find(MAGIC)
            if marker < 0:
                if len(self.preamble) > 1024 * 1024:
                    raise FrameError("no trusted frame start within 1 MiB serial preamble")
                return
            if marker > 1024 * 1024:
                raise FrameError("serial preamble exceeds bound")
            self.prefix_bytes = marker
            self.decoder = FrameDecoder(self.run_id, max_total_bytes=64 * 1024 * 1024)
            frame_bytes = bytes(self.preamble[marker:])
            self.preamble.clear()
        else:
            frame_bytes = data
        def deliver(frame: Any) -> None:
            self.on_frame(frame.channel, frame.payload, frame.header())
            self.frame_count += 1
        try:
            self.decoder.feed_each(frame_bytes, deliver)
        except ProtocolError as exc:
            raise FrameError(str(exc)) from exc

    def finish(self) -> None:
        if self.decoder is None:
            raise FrameError("trusted serial frame stream is absent")
        try:
            self.decoder.finish()
        except ProtocolError as exc:
            raise FrameError(str(exc)) from exc


def load_inspection_source(source_run_id: str, manifest: dict[str, Any], release: dict[str, Any], release_sha: str) -> tuple[Path, str, str]:
    if type(source_run_id) is not str or not RUN_ID_RE.fullmatch(source_run_id):
        fail("inspection source run ID must be a canonical UUID")
    source_dir = STORAGE / "runs" / source_run_id
    verify_private_dir(source_dir)
    result_path = source_dir / "evidence/result.json"
    result_info = result_path.lstat()
    if not stat.S_ISREG(result_info.st_mode) or stat.S_ISLNK(result_info.st_mode) or result_info.st_uid != os.getuid() or stat.S_IMODE(result_info.st_mode) != 0o400:
        fail("inspection source result is not an immutable private evidence record")
    source_result_raw = safe_read(result_path, 16 * 1024 * 1024)
    source_record = strict_json(source_result_raw, "source fixture result")
    allowed_fixture_ids = release["authorized_fixture_ids"]
    if source_record.get("schema") != "offline-proof-host-run-v1" or source_record.get("kind") != "fixture" or source_record.get("run_id") != source_run_id or source_record.get("manifest_sha256") != manifest["manifest_sha256"] or source_record.get("controller_release_sha256") != release_sha or source_record.get("case_id") not in allowed_fixture_ids or source_record.get("operator_execution") != "DENY" or type(source_record.get("returncode")) is not int:
        fail("inspection source is not a completed fixture under the same released manifest and authority")
    image = source_record.get("evidence_image")
    if type(image) is not dict or set(image) != {"path", "bytes", "sha256"} or image.get("path") != "writable.img" or type(image.get("bytes")) is not int or image["bytes"] != 4 * 1024 * 1024 * 1024 or type(image.get("sha256")) is not str or not re.fullmatch(r"[0-9a-f]{64}", image["sha256"]):
        fail("inspection source lacks a complete sealed writable-image digest")
    image_path = source_dir / "writable.img"
    image_info = image_path.lstat()
    if not stat.S_ISREG(image_info.st_mode) or stat.S_ISLNK(image_info.st_mode) or image_info.st_uid != os.getuid() or stat.S_IMODE(image_info.st_mode) != 0o400 or image_info.st_nlink != 1:
        fail("inspection source image is not a sealed private regular file")
    actual_sha, actual_bytes = hash_regular(image_path, 4 * 1024 * 1024 * 1024)
    if actual_bytes != image["bytes"] or actual_sha != image["sha256"]:
        fail("inspection source image bytes differ from the original fixture receipt")
    return image_path, actual_sha, sha256(source_result_raw)


PREPARATION_EXPORT_FIELDS = {
    "schema", "run_id", "manifest_sha256", "kernel_release", "kernel_bytes", "kernel_sha256",
    "initrd_bytes", "initrd_sha256", "rootfs_uuid", "root_partition_start_sector",
    "root_partition_sectors", "root_partition_device", "libseccomp_path", "libseccomp_sha256",
    "libseccomp_bytes", "runtime_identity_sha256", "package_versions", "source_file_count",
    "packet_count", "grader_file_count", "operator_execution",
}


def verify_successful_preparation(descriptor: dict[str, Any], manifest: dict[str, Any]) -> None:
    run_id = descriptor["run_id"]
    run = STORAGE / "runs" / run_id
    verify_private_dir(run)
    verify_private_dir(run / "evidence")
    result_path = run / "evidence/result.json"
    info = result_path.lstat()
    if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o400:
        fail("preparation result is not immutable private evidence")
    result_raw = safe_read(result_path, 16 * 1024 * 1024)
    result = strict_json(result_raw, "preparation host result")
    if (
        type(result) is not dict
        or result.get("schema") != "offline-proof-host-run-v1"
        or result.get("kind") != "preparation"
        or result.get("case_id") != "PREP-01"
        or result.get("run_id") != run_id
        or result.get("manifest_sha256") != manifest["manifest_sha256"]
        or result.get("operator_execution") != "DENY"
        or type(result.get("returncode")) is not int
        or result["returncode"] != 0
        or result.get("result") != "preparation-export-captured"
        or result.get("timed_out") is not False
        or result.get("interrupted") is not False
        or result.get("serial_eof") is not True
        or result.get("overflowed") is not False
        or result.get("host_exception") is not None
        or result.get("transport_error") is not None
        or result.get("artifact_error") is not None
        or result.get("stop_evidence") != {"requested": False}
        or result.get("stop_evidence_journal_error") is not None
    ):
        fail("preparation result does not prove a naturally completed, uninterrupted clean-shutdown chain")
    journal_path = run / "evidence/stop-events.jsonl"
    journal_info = journal_path.lstat()
    if not stat.S_ISREG(journal_info.st_mode) or stat.S_ISLNK(journal_info.st_mode) or journal_info.st_uid != os.getuid() or stat.S_IMODE(journal_info.st_mode) != 0o400:
        fail("preparation stop journal is not immutable private evidence")
    journal_raw = safe_read(journal_path, 8 * 1024 * 1024)
    journal_record = result.get("stop_event_journal")
    if type(journal_record) is not dict or journal_record != {"path": "evidence/stop-events.jsonl", "bytes": len(journal_raw), "sha256": sha256(journal_raw)} or journal_raw:
        fail("preparation has stop events, a missing journal binding, or mismatched durable stop bytes")
    records = result.get("control_records")
    if type(records) is not list:
        fail("preparation result lacks retained control records")
    exports = [row for row in records if type(row) is dict and row.get("schema") == "offline-proof-preparation-export-v1"]
    shutdowns = [row for row in records if type(row) is dict and row.get("schema") == "offline-proof-preparation-shutdown-v1"]
    if len(exports) != 1 or len(shutdowns) != 1 or any(exports[0].get(key) != descriptor.get(key) for key in PREPARATION_EXPORT_FIELDS):
        fail("preparation descriptor does not match its unique retained guest export")
    expected_shutdown = {
        "schema": "offline-proof-preparation-shutdown-v1",
        "status": "clean-shutdown-requested",
        "run_id": run_id,
        "manifest_sha256": descriptor["manifest_sha256"],
        "runtime_identity_sha256": descriptor["runtime_identity_sha256"],
        "rootfs_uuid": descriptor["rootfs_uuid"],
        "kernel_sha256": descriptor["kernel_sha256"],
        "initrd_sha256": descriptor["initrd_sha256"],
    }
    if shutdowns[0] != expected_shutdown:
        fail("preparation clean-shutdown record does not bind the retained runtime export")
    case_id = result.get("case_id")
    if case_id != "PREP-01":
        fail("preparation claim case is outside the one-shot fixed identity")
    claim_path = STORAGE / "ledger" / f"start-preparation-{case_id}.json"
    claim_info = claim_path.lstat()
    if not stat.S_ISREG(claim_info.st_mode) or stat.S_ISLNK(claim_info.st_mode) or claim_info.st_uid != os.getuid() or stat.S_IMODE(claim_info.st_mode) != 0o400:
        fail("preparation start claim is not immutable private evidence")
    claim_raw = safe_read(claim_path, 1024 * 1024)
    claim = strict_json(claim_raw, "preparation start claim")
    if (
        type(claim) is not dict
        or set(claim) != {"schema", "kind", "case_id", "run_id", "controller_release_sha256", "claimed_unix", "automatic_retry"}
        or claim.get("schema") != "offline-proof-start-claim-v1"
        or claim.get("kind") != "preparation"
        or claim.get("case_id") != case_id
        or claim.get("run_id") != run_id
        or claim.get("controller_release_sha256") != result.get("controller_release_sha256")
        or type(claim.get("claimed_unix")) is not int
        or claim.get("automatic_retry") is not False
        or sha256(claim_raw) != descriptor.get("preparation_claim_sha256")
    ):
        fail("preparation immutable claim does not join the successful run result")


def load_runtime_artifacts(manifest: dict[str, Any]) -> tuple[dict[str, Any], Path, Path, Path]:
    descriptor_path = STORAGE / "images/runtime-descriptor.json"
    descriptor_info = descriptor_path.lstat()
    if not stat.S_ISREG(descriptor_info.st_mode) or stat.S_ISLNK(descriptor_info.st_mode) or descriptor_info.st_uid != os.getuid() or stat.S_IMODE(descriptor_info.st_mode) != 0o400:
        fail("prepared runtime descriptor is not immutable private evidence")
    descriptor = strict_json(safe_read(descriptor_path, 1024 * 1024), "runtime descriptor")
    expected_keys = {"schema", "run_id", "manifest_sha256", "kernel_release", "kernel_bytes", "kernel_sha256", "initrd_bytes", "initrd_sha256", "rootfs_uuid", "root_partition_start_sector", "root_partition_sectors", "root_partition_device", "root_partition_sha256", "libseccomp_path", "libseccomp_sha256", "libseccomp_bytes", "runtime_identity_sha256", "package_versions", "source_file_count", "packet_count", "grader_file_count", "operator_execution", "runtime_image_sha256", "runtime_image_bytes", "recorded_after_vm_exit", "preparation_claim_sha256"}
    if type(descriptor) is not dict or set(descriptor) != expected_keys or descriptor.get("schema") != "offline-proof-preparation-export-v1" or descriptor.get("manifest_sha256") != manifest["manifest_sha256"] or descriptor.get("operator_execution") != "DENY" or descriptor.get("recorded_after_vm_exit") is not True:
        fail("prepared runtime descriptor shape or manifest binding mismatch")
    verify_successful_preparation(descriptor, manifest)
    if type(descriptor.get("run_id")) is not str or not RUN_ID_RE.fullmatch(descriptor["run_id"]) or type(descriptor.get("rootfs_uuid")) is not str or not re.fullmatch(r"[0-9a-fA-F-]{36}", descriptor["rootfs_uuid"]):
        fail("prepared runtime UUID identity is malformed")
    start_sector = descriptor.get("root_partition_start_sector")
    sectors = descriptor.get("root_partition_sectors")
    partition_device = descriptor.get("root_partition_device")
    if type(start_sector) is not int or type(sectors) is not int or start_sector < 1 or sectors < 1 or type(partition_device) is not str or not re.fullmatch(r"vda[0-9]+", partition_device):
        fail("prepared root partition geometry or device identity is malformed")
    if type(descriptor.get("root_partition_sha256")) is not str or not re.fullmatch(r"[0-9a-f]{64}", descriptor["root_partition_sha256"]):
        fail("prepared root partition digest is malformed")
    if type(descriptor.get("kernel_release")) is not str or not descriptor["kernel_release"] or len(descriptor["kernel_release"]) > 128:
        fail("prepared kernel release identity is malformed")
    for key in ("kernel_sha256", "initrd_sha256", "runtime_identity_sha256", "runtime_image_sha256", "libseccomp_sha256", "preparation_claim_sha256"):
        if type(descriptor.get(key)) is not str or not re.fullmatch(r"[0-9a-f]{64}", descriptor[key]):
            fail(f"prepared runtime digest malformed: {key}")
    library_path = descriptor.get("libseccomp_path")
    if type(library_path) is not str or not library_path.startswith("/usr/lib/aarch64-linux-gnu/libseccomp.so.2.") or ".." in Path(library_path).parts:
        fail("prepared runtime libseccomp path is outside the fixed package-owned directory")
    if type(descriptor.get("libseccomp_bytes")) is not int or not 20 <= descriptor["libseccomp_bytes"] <= 16 * 1024 * 1024:
        fail("prepared runtime libseccomp size is outside the reviewed bound")
    if type(descriptor.get("kernel_bytes")) is not int or not 64 <= descriptor["kernel_bytes"] <= 128 * 1024 * 1024 or type(descriptor.get("initrd_bytes")) is not int or not 1 <= descriptor["initrd_bytes"] <= 128 * 1024 * 1024:
        fail("prepared kernel/initrd byte counts are malformed")
    if descriptor.get("package_versions") != manifest["guest_runtime"]["package_versions"] or descriptor.get("source_file_count") != len(manifest["source_files"]) or descriptor.get("packet_count") != 463 or descriptor.get("grader_file_count") != len(manifest["grader_files"]):
        fail("prepared runtime source closure counts or package pins differ from manifest")
    runtime = STORAGE / "images/runtime.img"
    kernel = STORAGE / "images/kernel.Image"
    initrd = STORAGE / "images/initrd.img"
    for path in (runtime, kernel, initrd):
        info = path.lstat()
        if not stat.S_ISREG(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o400 or info.st_nlink != 1:
            fail(f"prepared runtime artifact is not sealed: {path.name}")

    runtime_sha, runtime_bytes = hash_regular(runtime, 8 * 1024 * 1024 * 1024)
    kernel_sha, kernel_bytes = hash_regular(kernel, 128 * 1024 * 1024)
    initrd_sha, initrd_bytes = hash_regular(initrd, 128 * 1024 * 1024)
    if runtime_sha != descriptor["runtime_image_sha256"] or runtime_bytes != descriptor["runtime_image_bytes"] or runtime_bytes > 8 * 1024 * 1024 * 1024 or kernel_sha != descriptor["kernel_sha256"] or kernel_bytes != descriptor["kernel_bytes"] or initrd_sha != descriptor["initrd_sha256"] or initrd_bytes != descriptor["initrd_bytes"]:
        fail("prepared runtime image/kernel/initrd differ from the immutable descriptor")
    return descriptor, runtime, kernel, initrd
TARGET_VIEW_DYNAMIC = {
    "/proc/self": ("proc-self-link", 0),
    "/proc/self/status": ("proc-status", 4 * 1024 * 1024),
    "/proc/self/cgroup": ("proc-cgroup", 64 * 1024),
    "/proc/self/fd": ("loader-fd-directory", 0),
    "/proc/self/fd/3": ("verified-libseccomp-fd", 16 * 1024 * 1024),
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
def validate_target_view(raw: bytes, *, expected_raw_sha256: str, prepared_runtime_context: dict[str, Any]) -> dict[str, Any]:
    if type(expected_raw_sha256) is not str or not re.fullmatch(r"[0-9a-f]{64}", expected_raw_sha256) or sha256(raw) != expected_raw_sha256:
        fail("target-view raw bytes differ from independent controller release")
    value = strict_json(raw, "target-view map")
    required = {"schema", "phase", "context", "entries", "descriptors", "interfaces"}
    if type(value) is not dict or set(value) != required or value.get("schema") != "offline-proof-target-view-v1" or value.get("phase") != "fixture" or value.get("context") != prepared_runtime_context:
        fail("target-view schema, phase or prepared-runtime lineage mismatch")
    if type(prepared_runtime_context) is not dict or set(prepared_runtime_context) != {"approved_plan_sha256", "source_map_sha256", "prepared_manifest_sha256", "prepared_runtime_identity_sha256", "prepared_runtime_image_sha256", "preparation_claim_sha256"}:
        fail("prepared runtime context is incomplete")
    if value.get("descriptors") != ["stdin", "stdout", "stderr"]:
        fail("target-view descriptor allowlist is not the fixed three standard streams")
    if value.get("interfaces") != TARGET_VIEW_INTERFACES:
        fail("target-view inherited interfaces differ from the fixed read-only contracts")
    entries = value.get("entries")
    if type(entries) is not list or not entries or len(entries) > 20000:
        fail("target-view entries are absent or exceed the fixed path bound")
    previous = ""
    seen: set[str] = set()
    directories: set[str] = set()
    required_dynamic = set(TARGET_VIEW_DYNAMIC)
    source_bytes = 0
    for row in entries:
        if type(row) is not dict or type(row.get("path")) is not str or not row["path"].startswith("/") or "\\" in row["path"] or len(row["path"]) > 4096 or any(ord(char) < 33 or ord(char) > 126 for char in row["path"]) or (row["path"] != "/" and any(part in {"", ".", ".."} for part in row["path"].split("/")[1:])):
            fail("target-view path is not a bounded normalized absolute guest path")
        path = row["path"]
        if any(path == prefix or path.startswith(prefix + "/") for prefix in ("/dev", "/sys", "/run", "/tmp", "/home", "/root")):
            fail("target-view cannot expose device, sysfs, host runtime, temporary or account paths")
        if path.startswith("/proof") and path not in TARGET_VIEW_FIXED_PATHS:
            fail("target-view proof filesystem path is outside the fixed writable/input closure")
        if path.startswith("/proc") and path not in TARGET_VIEW_FIXED_PATHS:
            fail("target-view proc path is outside the exact dynamic-read closure")
        if path in seen or path <= previous:
            fail("target-view paths must be unique and sorted")
        seen.add(path)
        previous = path
        kind = row.get("kind")
        expected_kind = TARGET_VIEW_FIXED_KINDS.get(path)
        if (expected_kind is not None and kind != expected_kind) or (path == "/" and kind != "directory"):
            fail("target-view fixed infrastructure path has the wrong entry type")
        if kind == "regular":
            if set(row) != {"path", "kind", "bytes", "sha256", "mode", "uid", "gid"} or type(row["bytes"]) is not int or row["bytes"] < 0 or type(row["sha256"]) is not str or not re.fullmatch(r"[0-9a-f]{64}", row["sha256"]) or any(type(row[key]) is not int or row[key] < 0 for key in ("mode", "uid", "gid")) or row["mode"] & ~0o7777:
                fail("target-view regular-file identity is malformed")
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
                fail("target-view directory identity is malformed")
            if any(type(row[key]) is not int or row[key] < 0 for key in ("mode", "uid", "gid")) or row["mode"] & ~0o7777:
                fail("target-view generated directory metadata is malformed")
            if path not in TARGET_VIEW_FIXED_PATHS and not has_source_identity:
                fail("runtime source directories require separate observed source metadata")
            directories.add(path)
            if path in TARGET_VIEW_WRITABLE_DIRS:
                if (row["uid"], row["gid"], row["mode"]) != (65532, 65532, 0o700):
                    fail(f"writable target-view directory differs from the fixed owned alias policy: {path}")
            elif row["uid"] != 0 or row["gid"] != 0 or row["mode"] & 0o222:
                fail(f"non-writable target-view directory is not root-owned and read-only by mode: {path}")
        elif kind == "symlink":
            if set(row) != {"path", "kind", "target"} or type(row.get("target")) is not str or not row["target"] or len(row["target"]) > 4096 or "\\" in row["target"] or any(ord(char) < 33 or ord(char) > 126 for char in row["target"]):
                fail("target-view symlink identity is malformed")
        elif kind == "dynamic":
            if set(row) != {"path", "kind", "operation", "maximum_bytes"} or TARGET_VIEW_DYNAMIC.get(path) != (row.get("operation"), row.get("maximum_bytes")) or type(row["maximum_bytes"]) is not int:
                fail("target-view dynamic-read operation is not explicitly allowed")
            if path in {"/proc/self", "/proc/self/fd"}:
                directories.add(path)
            required_dynamic.discard(path)
        else:
            fail("target-view entry kind is unknown")
    missing_fixed = set(TARGET_VIEW_FIXED_KINDS) - seen
    if missing_fixed:
        fail(f"target-view omits required fixed infrastructure entries: {sorted(missing_fixed)}")
    entry_by_path = {row["path"]: row for row in entries}
    for row in entries:
        parent = str(PurePosixPath(row["path"]).parent)
        while parent != "/":
            if entry_by_path.get(parent, {}).get("kind") == "symlink":
                fail(f"target-view entries must use canonical paths beneath symlink aliases: {row['path']}")
            parent = str(PurePosixPath(parent).parent)
        if row["kind"] == "symlink":
            target = row["target"]
            resolved = PurePosixPath(os.path.normpath(str(PurePosixPath(row["path"]).parent / target if not target.startswith("/") else target)))
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
                resolved = PurePosixPath(os.path.normpath(str(PurePosixPath(cursor).parent / next_target if not next_target.startswith("/") else next_target)))
                cursor = str(resolved)
            else:
                fail("target-view symlink chain does not reach an explicitly mapped entry")
    if required_dynamic:
        fail(f"target-view omits required typed dynamic reads: {sorted(required_dynamic)}")
    for row in entries:
        parent = str(PurePosixPath(row["path"]).parent)
        while parent != "/":
            if parent not in directories:
                fail(f"target-view omits explicit parent directory: {parent}")
            parent = str(PurePosixPath(parent).parent)
    return value


def prepared_root_extent(fd: int, descriptor: dict[str, Any], runtime_size: int) -> tuple[int, int, str]:
    start_sector = descriptor["root_partition_start_sector"]
    sectors = descriptor["root_partition_sectors"]
    start = start_sector * 512
    length = sectors * 512
    match = re.fullmatch(r"vda([1-9][0-9]*)", descriptor["root_partition_device"])
    if start < 512 or length < 512 or start + length > runtime_size or length > 8 * 1024 * 1024 * 1024 or match is None:
        fail("prepared root partition extent exceeds the sealed runtime image")
    header = bytearray(os.pread(fd, 512, 512))
    if len(header) != 512 or header[:8] != b"EFI PART":
        fail("prepared runtime disk has no valid GPT header")
    header_size = struct.unpack_from("<I", header, 12)[0]
    stored_header_crc = struct.unpack_from("<I", header, 16)[0]
    if not 92 <= header_size <= 512:
        fail("prepared runtime GPT header size is invalid")
    struct.pack_into("<I", header, 16, 0)
    if zlib.crc32(header[:header_size]) & 0xffffffff != stored_header_crc:
        fail("prepared runtime GPT header checksum is invalid")
    entries_lba = struct.unpack_from("<Q", header, 72)[0]
    entry_count, entry_size, entries_crc = struct.unpack_from("<III", header, 80)
    index = int(match.group(1)) - 1
    table_bytes = entry_count * entry_size
    total_sectors = runtime_size // 512
    backup_lba, first_usable, last_usable = struct.unpack_from("<QQQ", header, 32)
    if struct.unpack_from("<Q", header, 24)[0] != 1 or backup_lba != total_sectors - 1 or entries_lba != 2 or first_usable > start_sector or last_usable < start_sector + sectors - 1 or last_usable >= backup_lba or not 1 <= entry_count <= 128 or entry_size != 128 or index >= entry_count or table_bytes > 128 * 128 or (entries_lba + (table_bytes + 511) // 512) * 512 > runtime_size:
        fail("prepared runtime GPT partition table geometry is invalid")
    entries = os.pread(fd, table_bytes, entries_lba * 512)
    if len(entries) != table_bytes or zlib.crc32(entries) & 0xffffffff != entries_crc:
        fail("prepared runtime GPT partition table checksum is invalid")
    entry = entries[index * entry_size:(index + 1) * entry_size]
    if entry[:16] == bytes(16) or entry[16:32] == bytes(16) or struct.unpack_from("<QQ", entry, 32) != (start_sector, start_sector + sectors - 1):
        fail("prepared root extent does not match its GPT partition identity")
    digest = hashlib.sha256()
    offset = start
    while offset < start + length:
        block = os.pread(fd, min(CHUNK, start + length - offset), offset)
        if not block:
            fail("prepared root partition extent ended before its verified geometry")
        digest.update(block)
        offset += len(block)
    actual = digest.hexdigest()
    if actual != descriptor.get("root_partition_sha256"):
        fail("prepared root partition bytes differ from the preparation lineage")
    return start, length, actual


def fixture_runtime_input_bytes(root_bytes: int, view_bytes: int) -> int:
    if root_bytes < 512 or root_bytes % 512 or not 1 <= view_bytes <= 16 * 1024 * 1024:
        fail("fixture input reservation geometry is invalid")
    framed_bytes = (512 + view_bytes + 511) // 512 * 512
    runtime_start = 2048
    view_start = ((runtime_start + root_bytes // 512 + 2047) // 2048) * 2048
    total_sectors = view_start + framed_bytes // 512 + 34
    return total_sectors * 512


def target_view_device_image(run: Path, runtime: Path, expected_sha256: str, manifest: dict[str, Any], descriptor: dict[str, Any]) -> tuple[Path, int, int]:
    raw = safe_read(STORAGE / "ledger/target-view.json", 16 * 1024 * 1024)
    prepared_context = {
        "approved_plan_sha256": manifest["approved_plan_sha256"],
        "source_map_sha256": manifest["source_map"]["raw_sha256"],
        "prepared_manifest_sha256": manifest["manifest_sha256"],
        "prepared_runtime_identity_sha256": descriptor["runtime_identity_sha256"],
        "prepared_runtime_image_sha256": descriptor["runtime_image_sha256"],
        "preparation_claim_sha256": descriptor["preparation_claim_sha256"],
    }
    validate_target_view(raw, expected_raw_sha256=expected_sha256, prepared_runtime_context=prepared_context)
    framed = b"QF5TVIEW\x01" + len(raw).to_bytes(8, "big") + bytes.fromhex(expected_sha256)
    framed += b"\x00" * (512 - len(framed)) + raw
    framed += b"\x00" * ((-len(framed)) % 512)
    runtime_fd = os.open(runtime, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    runtime_info = os.fstat(runtime_fd)
    if not stat.S_ISREG(runtime_info.st_mode) or runtime_info.st_size != descriptor["runtime_image_bytes"] or runtime_info.st_size % 512:
        os.close(runtime_fd)
        fail("sealed runtime input is not a sector-aligned regular image")
    try:
        root_offset, root_bytes, root_sha = prepared_root_extent(runtime_fd, descriptor, runtime_info.st_size)
    except BaseException:
        os.close(runtime_fd)
        raise
    runtime_start = 2048
    runtime_sectors = root_bytes // 512
    runtime_end = runtime_start + runtime_sectors - 1
    view_start = ((runtime_end + 1 + 2047) // 2048) * 2048
    view_sectors = len(framed) // 512
    total_sectors = view_start + view_sectors + 34
    last_usable = total_sectors - 34
    if runtime_start < 34 or runtime_end > last_usable or view_start + view_sectors - 1 > last_usable or total_sectors * 512 > 8 * 1024 * 1024 * 1024 + 32 * 1024 * 1024:
        os.close(runtime_fd)
        fail("single read-only runtime/input image exceeds fixed GPT or capacity bounds")
    entries = bytearray(128 * 128)
    partition_type = uuid.UUID("0fc63daf-8483-4772-8e79-3d69d8477de4").bytes_le
    disk_guid = uuid.uuid5(uuid.NAMESPACE_OID, descriptor["root_partition_sha256"] + expected_sha256 + run.name).bytes_le
    for index, (name, start, end) in enumerate((
        ("offline-proof-runtime", runtime_start, runtime_end),
        ("offline-proof-view", view_start, view_start + view_sectors - 1),
    )):
        offset = index * 128
        entry_guid = uuid.uuid5(uuid.NAMESPACE_OID, str(uuid.UUID(bytes=disk_guid)) + name).bytes_le
        entries[offset:offset + 16] = partition_type
        entries[offset + 16:offset + 32] = entry_guid
        struct.pack_into("<QQQ", entries, offset + 32, start, end, 0)
        encoded_name = name.encode("utf-16le")
        entries[offset + 56:offset + 56 + len(encoded_name)] = encoded_name
    entries_crc = zlib.crc32(entries) & 0xffffffff

    def header(current: int, backup: int, entries_lba: int) -> bytes:
        value = bytearray(512)
        struct.pack_into("<8sIIIIQQQQ16sQIII", value, 0, b"EFI PART", 0x00010000, 92, 0, 0, current, backup, 34, last_usable, disk_guid, entries_lba, 128, 128, entries_crc)
        struct.pack_into("<I", value, 16, zlib.crc32(value[:92]) & 0xffffffff)
        return bytes(value)

    image = run / "host/runtime-input.img"
    destination_fd = os.open(image, os.O_RDWR | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)

    def write_at(offset: int, data: bytes) -> None:
        position = offset
        view = memoryview(data)
        while view:
            count = os.pwrite(destination_fd, view, position)
            if count <= 0:
                fail("short write while constructing the read-only runtime/input image")
            position += count
            view = view[count:]

    try:
        os.ftruncate(destination_fd, total_sectors * 512)
        mbr = bytearray(512)
        struct.pack_into("<B3sB3sII", mbr, 446, 0, b"\x00\x02\x00", 0xee, b"\xff\xff\xff", 1, min(total_sectors - 1, 0xffffffff))
        mbr[510:512] = b"\x55\xaa"
        write_at(0, bytes(mbr))
        write_at(512, header(1, total_sectors - 1, 2))
        write_at(1024, bytes(entries))
        runtime_sha, runtime_bytes = hash_regular(runtime, 8 * 1024 * 1024 * 1024)
        if runtime_bytes != runtime_info.st_size or runtime_sha != descriptor["runtime_image_sha256"]:
            fail("sealed prepared disk differs from its original preparation evidence")
        source_hash = hashlib.sha256()
        source_total = 0
        position = runtime_start * 512
        while source_total < root_bytes:
            block = os.pread(runtime_fd, min(CHUNK, root_bytes - source_total), root_offset + source_total)
            if not block:
                fail("prepared root partition ended before its verified geometry")
            source_total += len(block)
            source_hash.update(block)
            write_at(position, block)
            position += len(block)
        after = os.fstat(runtime_fd)
        if source_total != root_bytes or source_hash.hexdigest() != root_sha or (runtime_info.st_dev, runtime_info.st_ino, runtime_info.st_size, runtime_info.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns):
            fail("prepared root partition changed while assembling the one-device read-only input")
        write_at(view_start * 512, framed)
        backup_entries_lba = total_sectors - 33
        write_at(backup_entries_lba * 512, bytes(entries))
        write_at((total_sectors - 1) * 512, header(total_sectors - 1, 1, backup_entries_lba))
        os.fsync(destination_fd)
        os.fchmod(destination_fd, 0o400)
        os.fsync(destination_fd)
    except BaseException:
        os.close(destination_fd)
        os.close(runtime_fd)
        raise
    else:
        os.close(destination_fd)
        os.close(runtime_fd)
    return image, runtime_start, view_start



def build_vm_args(kind: str, run: Path, run_id: str, case_id: str, manifest: dict[str, Any], manifest_path: Path, closure_root: Path, remaining_ms: int, source_run_id: str | None = None, source_image: Path | None = None, source_image_sha: str | None = None, target_view_sha256: str | None = None) -> tuple[list[str], dict[str, Any]]:
    vfkit = STORAGE / "bin/vfkit"
    if kind == "preparation":
        source = STORAGE / "images/debian/debian-13-generic-arm64.raw"
        runtime = STORAGE / "images/runtime.img"
        copy_exclusive(source, runtime, 8 * 1024 * 1024 * 1024, manifest["guest_runtime"]["rootfs_sha512"])
        user_data = cloud_init_user_data(manifest, manifest_path, closure_root, run_id)
        meta_data = b"instance-id: offline-proof-" + run_id.encode("ascii") + b"\nlocal-hostname: offline-proof\n"
        write_exclusive(run / "host/user-data", user_data, 0o400)
        write_exclusive(run / "host/meta-data", meta_data, 0o400)
        socket_path = run / "host/vfkit.sock"
        if len(str(socket_path).encode()) > 100:
            fail("vfkit Unix socket path exceeds pinned macOS limit")
        efi_store = run / "host/efi-vars"
        args = [
            str(vfkit), "--log-level", "error", "--cpus", "2", "--memory", "4096",
            "--bootloader", f"efi,variable-store={efi_store},create",
            "--device", f"virtio-blk,path={runtime}",
            "--cloud-init", f"{run / 'host/user-data'},{run / 'host/meta-data'}",
            "--device", "virtio-serial,stdio", "--device", "virtio-rng",
            "--restful-uri", f"unix://{socket_path}",
        ]
        return args, {"socket": socket_path, "deadline_seconds": 900, "runtime_image": runtime, "kernel": None, "initrd": None}
    if kind in {"fixture", "inspection"}:
        descriptor, runtime, kernel, initrd = load_runtime_artifacts(manifest)
        runtime_identity = descriptor["runtime_identity_sha256"]
        if kind == "fixture":
            if target_view_sha256 is None:
                fail("fixture start requires a separately approved target-view map")
            runtime_input, runtime_start, view_start = target_view_device_image(run, runtime, target_view_sha256, manifest, descriptor)
            writable = run / "writable.img"
            fd = os.open(writable, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
            try:
                os.ftruncate(fd, 4 * 1024 * 1024 * 1024)
                os.fsync(fd)
            finally:
                os.close(fd)
            cmdline = f"root=UUID={descriptor['rootfs_uuid']} ro rootwait quiet loglevel=0 init=/opt/offline-proof/init offlineproof.mode=fixture offlineproof.runid={run_id} offlineproof.case={case_id} offlineproof.manifest={manifest['manifest_sha256']} offlineproof.runtime_identity={runtime_identity} offlineproof.budget_ms={remaining_ms} offlineproof.target_view_sha256={target_view_sha256} offlineproof.prepared_image_sha256={descriptor['runtime_image_sha256']} offlineproof.prepared_image_bytes={descriptor['runtime_image_bytes']} offlineproof.prepared_root_partition_bytes={descriptor['root_partition_sectors'] * 512} offlineproof.prepared_root_partition_sha256={descriptor['root_partition_sha256']} offlineproof.preparation_claim_sha256={descriptor['preparation_claim_sha256']} offlineproof.target_view_start={view_start} console=hvc0"
            devices = ["--device", f"usb-mass-storage,path={runtime_input},readonly", "--device", f"virtio-blk,path={writable}"]
            spec = {"socket": run / "host/vfkit.sock", "deadline_seconds": 300, "runtime_image": runtime, "runtime_input_image": runtime_input, "runtime_start_sector": runtime_start, "target_view_start_sector": view_start, "kernel": kernel, "initrd": initrd, "writable_image": writable, "target_view_sha256": target_view_sha256, "descriptor": descriptor}
        else:
            if source_run_id is None or source_image is None or source_image_sha is None:
                fail("read-only inspection requires its separately verified fixture evidence image")
            cmdline = f"root=UUID={descriptor['rootfs_uuid']} ro rootwait quiet loglevel=0 init=/opt/offline-proof/init offlineproof.mode=inspection offlineproof.runid={run_id} offlineproof.case={case_id} offlineproof.manifest={manifest['manifest_sha256']} offlineproof.runtime_identity={runtime_identity} offlineproof.budget_ms={remaining_ms} offlineproof.source_runid={source_run_id} offlineproof.image_sha256={source_image_sha} console=hvc0"
            devices = ["--device", f"usb-mass-storage,path={runtime},readonly", "--device", f"usb-mass-storage,path={source_image},readonly"]
            spec = {"socket": run / "host/vfkit.sock", "deadline_seconds": 300, "runtime_image": runtime, "kernel": kernel, "initrd": initrd, "source_image": source_image, "source_image_sha256": source_image_sha, "source_run_id": source_run_id, "descriptor": descriptor}
        socket_path = spec["socket"]
        if len(str(socket_path).encode()) > 100:
            fail("vfkit Unix socket path exceeds pinned macOS limit")
        args = [
            str(vfkit), "--log-level", "error", "--cpus", "2", "--memory", "4096",
            "--bootloader", f"linux,kernel={kernel},initrd={initrd},cmdline=\"{cmdline}\"",
            *devices, "--device", "virtio-serial,stdio", "--device", "virtio-rng",
            "--restful-uri", f"unix://{socket_path}",
        ]
        return args, spec
    fail("unknown VM kind")


def _run_vm_locked(kind: str, case_id: str, run_id: str, manifest_path: Path, release_path: Path, release_sha: str, confirm: str, source_run_id: str | None = None) -> dict[str, Any]:
    if not sys.stdin.isatty():
        fail("one-shot VM launch requires an interactive controller TTY")
    check_storage()
    lock = load_lock()
    verify_project_pins(lock)
    preflight_sha = verify_preflight(lock)
    verify_manifest_storage_path(manifest_path)
    release = _release(release_path, release_sha, None, kind, case_id)
    manifest = verify_manifest(manifest_path, lock, expected_source_map_sha256=release["source_map_sha256"])
    if release["approved_plan_sha256"] != manifest["approved_plan_sha256"] or release["manifest_sha256"] != manifest["manifest_sha256"]:
        fail("controller release is not bound to current plan/manifest")
    reserve_campaign_capacity(kind, additional_needed=fixture_capacity_reservation() if kind == "fixture" else 0)
    if kind == "preparation" and case_id != "PREP-01":
        fail("only the single named preparation VM is permitted")
    if kind == "fixture" and case_id not in FIXTURE_IDS:
        fail("fixture ID is outside the exact eight-case allowlist")
    if kind == "inspection" and case_id not in INSPECTION_IDS:
        fail("inspection ID is outside the exact two-case allowlist")
    if release["launcher_sha256"] != current_launcher_digest():
        fail("controller release is not bound to current launcher source")
    phrase = f"START ONE {kind.upper()} VM {run_id} WITH OPERATOR EXECUTION DENIED"
    if confirm != phrase:
        fail("explicit controller confirmation phrase mismatch")
    source_image: Path | None = None
    source_image_sha: str | None = None
    source_result_sha: str | None = None
    if kind == "inspection":
        source_image, source_image_sha, source_result_sha = load_inspection_source(source_run_id or "", manifest, release, release_sha)

    elif source_run_id is not None:
        fail("source-run-id is valid only for read-only inspection")
    if type(run_id) is not str or not RUN_ID_RE.fullmatch(run_id):
        fail("run id must be a canonical UUID")
    run = create_run_dir(run_id)
    duration = 900 if kind == "preparation" else 300
    closure_root = manifest_path.parent / "closure"
    args, launch_spec = build_vm_args(kind, run, run_id, case_id, manifest, manifest_path, closure_root, duration * 1000, source_run_id, source_image, source_image_sha, release["target_view_sha256"])
    env = {"PATH": "/usr/bin:/bin", "HOME": str(run / "host/empty-home"), "TMPDIR": str(run / "host/tmp"), "LANG": "C"}
    (run / "host/empty-home").mkdir(mode=0o700, exist_ok=False)
    (run / "host/tmp").mkdir(mode=0o700, exist_ok=False)
    os.chmod(run / "host/empty-home", 0o700)
    os.chmod(run / "host/tmp", 0o700)
    write_exclusive(run / "host/argv.json", canonical({"argv": args, "cwd": str(run), "environment_keys": sorted(env), "vm_kind": kind, "case_id": case_id, "operator_execution": "DENY"}) + b"\n", 0o400)
    record: dict[str, Any] = {
        "schema": "offline-proof-host-run-v1", "run_id": run_id, "kind": kind, "case_id": case_id,
        "preflight_sha256": preflight_sha,
        "manifest_sha256": manifest["manifest_sha256"], "controller_release_sha256": release_sha,
        "source_run_id": source_run_id,
        "source_image_sha256": source_image_sha,
        "source_result_sha256": source_result_sha,
        "started_unix": None, "started_monotonic": None, "operator_execution": "DENY", "automatic_retry": False,
        "stdout_observed": False, "stderr_observed": False, "serial_observed": False,
        "serial_eof": False, "vfkit_stderr_observed": False,
        "returncode": None, "timed_out": False, "interrupted": False, "published": False,
    }
    serial_raw = bytearray()
    vfkit_stderr = bytearray()
    proof_streams = {"stdout": bytearray(), "stderr": bytearray()}
    proof_stream_observed = {"stdout": False, "stderr": False}
    artifact_buffers = {"kernel": bytearray(), "initrd": bytearray()}
    artifact_expectations: dict[str, dict[str, Any]] = {}
    state_observation_bytes = 0
    control_records: list[dict[str, Any]] = []
    stop_requested = False
    overflowed = False
    global _INTERRUPTED
    _INTERRUPTED = False
    old_handlers = {}
    selector: selectors.BaseSelector | None = None
    proc: subprocess.Popen[bytes] | None = None
    stop_evidence: dict[str, Any] = {"requested": False}
    stop_events_path = run / "evidence/stop-events.jsonl"
    stop_events_fd = os.open(stop_events_path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
    stop_events_raw = bytearray()

    def persist_stop_event(event: dict[str, Any]) -> None:
        payload = canonical(event) + b"\n"
        view = memoryview(payload)
        while view:
            count = os.write(stop_events_fd, view)
            if count <= 0:
                fail("short durable stop-evidence journal write")
            view = view[count:]
        os.fsync(stop_events_fd)
        stop_events_raw.extend(payload)
    hard_stop_sent = False

    def on_frame(channel: str, payload: bytes, header: dict[str, Any]) -> None:
        nonlocal stop_requested, overflowed
        if channel in proof_streams:
            buf = proof_streams[channel]
            proof_stream_observed[channel] = True
            room = STREAM_LIMIT - len(buf)
            if len(payload) > room:
                if room:
                    buf.extend(payload[:room])
                overflowed = True
                raise FrameError(f"{channel} frame exceeds raw stream quota")
            buf.extend(payload)
        elif channel in artifact_buffers:
            buf = artifact_buffers[channel]
            if len(buf) + len(payload) > 64 * 1024 * 1024:
                raise FrameError("trusted artifact transport exceeds 64 MiB")
            buf.extend(payload)
        elif channel == "control":
            value = strict_json(payload, "guest control frame")
            if "artifact" in value and value["artifact"] in artifact_buffers:
                artifact_expectations[value["artifact"]] = value
            else:
                control_records.append(value)
                if (value.get("run_id") == run_id and value.get("status") in {"exited", "rejected", "timed_out", "truncated"}) or (value.get("schema") == "offline-proof-inspection-v1" and value.get("run_id") == run_id and value.get("source_run_id") == source_run_id):
                    stop_requested = True
        elif channel in {"status", "guest-error"}:
            control_records.append({"channel": channel, "payload_sha256": sha256(payload), "payload_bytes": len(payload)})
        else:
            raise FrameError(f"unknown frame channel {channel}")
    scanner = SerialFrameScanner(run_id, on_frame)

    deadline: float | None = None
    started_mono: float | None = None
    try:
        for sig in (signal.SIGINT, signal.SIGTERM):
            old_handlers[sig] = signal.signal(sig, _signal_handler)
        vfkit_path = STORAGE / "bin/vfkit"
        vfkit_info = vfkit_path.lstat()
        if args[0] != str(vfkit_path) or not stat.S_ISREG(vfkit_info.st_mode) or stat.S_ISLNK(vfkit_info.st_mode) or vfkit_info.st_uid != os.getuid() or vfkit_info.st_nlink != 1 or stat.S_IMODE(vfkit_info.st_mode) != 0o500:
            fail("vfkit executable identity/permissions differ from the acquired binary")
        vfkit_sha, _vfkit_bytes = hash_regular(vfkit_path, lock["assets"]["vfkit"]["max_download_bytes"])
        if vfkit_sha != lock["assets"]["vfkit"]["sha256"]:
            fail("vfkit executable changed after preflight and before the single-use start")
        record["vfkit_sha256"] = vfkit_sha
        started_unix = int(time.time())
        started_mono = time.monotonic()
        deadline = started_mono + duration
        record["started_unix"] = started_unix
        record["started_monotonic"] = started_mono
        refreshed_release = _release(release_path, release_sha, manifest, kind, case_id)
        if refreshed_release != release:
            fail("controller release bytes changed during blocking start preparation")
        claim_start(kind, case_id, run_id, release_sha)
        if kind == "fixture" and case_id == "H8-one-shot-replay":
            record["host_claim_replay"] = verify_h8_claim_replay_refusal(case_id, run_id, release_sha)
        proc = subprocess.Popen(args, stdin=subprocess.DEVNULL, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=run, env=env, close_fds=True, bufsize=0)
        if proc.pid <= 0:
            fail("vfkit spawn returned non-positive PID")
        record["vfkit_pid"] = proc.pid
        record["spawned_monotonic"] = time.monotonic()
        record["stdout_observed"] = False
        record["stderr_observed"] = False
        assert proc.stdout is not None and proc.stderr is not None
        selector = selectors.DefaultSelector()
        selector.register(proc.stdout, selectors.EVENT_READ, "serial")
        selector.register(proc.stderr, selectors.EVENT_READ, "vfkit_stderr")
        rest_sock = launch_spec["socket"]
        rest_ready = False
        inspect_record: dict[str, Any] | None = None
        last_state_poll = started_mono - 1.0
        while selector.get_map() or proc.poll() is None:
            now = time.monotonic()
            if now >= deadline and proc.poll() is None:
                record["timed_out"] = True
                if not hard_stop_sent:
                    stop_evidence = stop_vm(rest_sock, proc, hard=True, deadline=deadline, persist=persist_stop_event)
                    stop_evidence["requested"] = True
                    hard_stop_sent = True
            if _INTERRUPTED and proc.poll() is None:
                record["interrupted"] = True
                if not hard_stop_sent:
                    stop_evidence = stop_vm(rest_sock, proc, hard=True, deadline=deadline, persist=persist_stop_event)
                    stop_evidence["requested"] = True
                    hard_stop_sent = True
            if not hard_stop_sent and not rest_ready and now - started_mono < 10 and proc.poll() is None:
                try:
                    wait_socket(rest_sock, proc, min(deadline, now + 0.2))
                    rest_ready = True
                except LaunchError:
                    pass
            if not hard_stop_sent and rest_ready and now - last_state_poll >= 1.0 and proc.poll() is None:
                state_code, state_raw = rest_request(rest_sock, "GET", "/vm/state", deadline=deadline)
                if state_code != 200:
                    fail("vfkit state endpoint returned non-200")
                state = strict_json(state_raw, "vfkit state")
                observation = {"state": state, "response_bytes": len(state_raw), "response_sha256": sha256(state_raw)}
                observation_size = len(canonical(observation))
                if observation_size > STATE_OBSERVATION_LIMIT - state_observation_bytes:
                    fail("vfkit state observations exceed the durable 2 MiB bound")
                record.setdefault("state_observations", []).append(observation)
                state_observation_bytes += observation_size
                last_state_poll = now
                if inspect_record is None:
                    inspect_code, inspect_raw = rest_request(rest_sock, "GET", "/vm/inspect", deadline=deadline)
                    if inspect_code != 200:
                        fail("vfkit inspect endpoint returned non-200")
                    inspect_record = strict_json(inspect_raw, "vfkit inspect")
                    serialized = json.dumps(inspect_record, sort_keys=True).lower()
                    forbidden = ("virtio-net", "virtio-fs", "virtio-vsock", "rosetta", "virtio-gpu")
                    if any(name in serialized for name in forbidden):
                        fail("actual vfkit device inspection found a forbidden device")
                    if inspect_record.get("cpus") != 2 or inspect_record.get("memory") != 4096:
                        fail("actual vfkit vCPU/memory inspection differs from fixed plan")
                    record["vfkit_inspection"] = inspect_record
            events = selector.select(timeout=max(0.0, min(0.05, deadline - time.monotonic())))
            for key, _ in events:
                block = os.read(key.fileobj.fileno(), CHUNK)
                if not block:
                    selector.unregister(key.fileobj)
                    if key.data == "serial":
                        record["serial_eof"] = True
                    else:
                        record["vfkit_stderr_observed"] = True
                    continue
                if key.data == "serial":
                    if len(serial_raw) + len(block) > TRANSPORT_LIMIT:
                        overflowed = True
                        record["serial_overflow"] = True
                        if proc.poll() is None and not hard_stop_sent:
                            stop_evidence = stop_vm(rest_sock, proc, hard=True, deadline=deadline, persist=persist_stop_event)
                            stop_evidence["requested"] = True
                            hard_stop_sent = True
                        room = TRANSPORT_LIMIT - len(serial_raw)
                        serial_raw.extend(block[:max(0, room)])
                        continue
                    serial_raw.extend(block)
                    record["serial_observed"] = True
                    try:
                        scanner.feed(block)
                    except FrameError as exc:
                        record["transport_error"] = str(exc)
                        if proc.poll() is None and not hard_stop_sent:
                            stop_evidence = stop_vm(rest_sock, proc, hard=True, deadline=deadline, persist=persist_stop_event)
                            stop_evidence["requested"] = True
                            hard_stop_sent = True
                else:
                    room = STREAM_LIMIT - len(vfkit_stderr)
                    vfkit_stderr.extend(block[:max(0, room)])
                    if len(block) > room:
                        record["vfkit_stderr_truncated"] = True
                        overflowed = True
                        if proc.poll() is None and not hard_stop_sent:
                            stop_evidence = stop_vm(rest_sock, proc, hard=True, deadline=deadline, persist=persist_stop_event)
                            stop_evidence["requested"] = True
                            hard_stop_sent = True
            if time.monotonic() >= deadline and (proc.poll() is None or selector.get_map()):
                if proc.poll() is None and not hard_stop_sent:
                    record["timed_out"] = True
                    stop_evidence = stop_vm(rest_sock, proc, hard=True, deadline=deadline, persist=persist_stop_event)
                    stop_evidence["requested"] = True
                    hard_stop_sent = True
                if selector.get_map():
                    record["stream_drain_incomplete"] = True
                break
        try:
            scanner.finish()
        except FrameError as exc:
            record.setdefault("transport_error", str(exc))
        record["frame_sequence_count"] = scanner.frame_count
        record["serial_preamble_bytes"] = scanner.prefix_bytes
        record["returncode"] = proc.poll()
    except BaseException as exc:
        record["host_exception"] = {"type": type(exc).__name__, "reason": str(exc)[:4096]}
        if proc is not None and proc.poll() is None and not hard_stop_sent:
            stop_evidence = stop_vm(launch_spec["socket"], proc, hard=True, deadline=deadline, persist=persist_stop_event)
            stop_evidence["requested"] = True
            hard_stop_sent = True
    finally:
        if _INTERRUPTED:
            record["interrupted"] = True
        for sig, handler in old_handlers.items():
            signal.signal(sig, handler)
        record["finished_unix"] = int(time.time())
        finished_mono = time.monotonic()
        record["finished_monotonic"] = finished_mono
        record["elapsed_seconds"] = finished_mono - started_mono if started_mono is not None else None
        record["stop_evidence"] = stop_evidence
        try:
            os.fsync(stop_events_fd)
            os.fchmod(stop_events_fd, 0o400)
            os.fsync(stop_events_fd)
        except OSError as exc:
            record["stop_evidence_journal_error"] = f"{type(exc).__name__}: {exc}"[:1024]
        finally:
            try:
                os.close(stop_events_fd)
            except OSError as exc:
                record["stop_evidence_journal_error"] = f"{type(exc).__name__}: {exc}"[:1024]
        try:
            stop_journal_raw = safe_read(stop_events_path, 8 * 1024 * 1024)
            record["stop_event_journal"] = {"path": "evidence/stop-events.jsonl", "bytes": len(stop_journal_raw), "sha256": sha256(stop_journal_raw)}
            if stop_journal_raw != bytes(stop_events_raw):
                record["stop_evidence_journal_error"] = "retained stop journal bytes differ from fully fsynced event records"
        except (LaunchError, OSError) as exc:
            record["stop_evidence_journal_error"] = f"{type(exc).__name__}: {exc}"[:1024]
        unconfirmed = proc is not None and proc.poll() is None
        if unconfirmed:
            record["unconfirmed_vm"] = {"pid": proc.pid, "deadline_monotonic": started_mono + duration if started_mono is not None else None, "stop_evidence": stop_evidence}
            write_exclusive(STORAGE / "ledger/unconfirmed-vm.json", canonical({"schema": "offline-proof-unconfirmed-vm-v1", "run_id": run_id, **record["unconfirmed_vm"]}) + b"\n", 0o400)
        record["serial_bytes_retained"] = len(serial_raw)
        record["serial_sha256"] = sha256(bytes(serial_raw))
        record["vfkit_stderr_bytes_retained"] = len(vfkit_stderr)
        record["vfkit_stderr_sha256"] = sha256(bytes(vfkit_stderr))
        record["stdout_observed"] = proof_stream_observed["stdout"]
        record["stderr_observed"] = proof_stream_observed["stderr"]
        record["proof_streams"] = {
            name: {
                "observed": proof_stream_observed[name],
                "bytes": len(data) if proof_stream_observed[name] else None,
                "sha256": sha256(bytes(data)) if proof_stream_observed[name] else None,
                "path": f"evidence/{name}.bin" if proof_stream_observed[name] else None,
            }
            for name, data in proof_streams.items()
        }
        record["control_records"] = control_records
        record["frame_sequence_count"] = scanner.frame_count
        record["serial_preamble_bytes"] = scanner.prefix_bytes
        record["overflowed"] = overflowed
        record["result"] = "failure"
        # Evidence is exclusive and retained even for failures; no success is fabricated.
        write_exclusive(run / "evidence/serial.bin", bytes(serial_raw), 0o400)
        write_exclusive(run / "evidence/vfkit.stderr", bytes(vfkit_stderr), 0o400)
        for name, data in proof_streams.items():
            if proof_stream_observed[name]:
                write_exclusive(run / f"evidence/{name}.bin", bytes(data), 0o400)
        write_exclusive(run / "evidence/control.jsonl", b"".join(canonical(item) + b"\n" for item in control_records), 0o400)
        if kind == "fixture" and proc is not None and proc.poll() is not None:
            evidence_image = launch_spec.get("writable_image")
            try:
                if not isinstance(evidence_image, Path):
                    fail("fixture writable image path is absent after VM exit")
                image_info = evidence_image.lstat()
                if not stat.S_ISREG(image_info.st_mode) or stat.S_ISLNK(image_info.st_mode) or image_info.st_uid != os.getuid() or image_info.st_nlink != 1 or image_info.st_size != 4 * 1024 * 1024 * 1024:
                    fail("fixture writable image is not the expected private 4 GiB regular file")
                image_fd = os.open(evidence_image, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
                try:
                    opened = os.fstat(image_fd)
                    if (opened.st_dev, opened.st_ino, opened.st_size) != (image_info.st_dev, image_info.st_ino, image_info.st_size):
                        fail("fixture writable image changed identity before sealing")
                    os.fchmod(image_fd, 0o400)
                    os.fsync(image_fd)
                finally:
                    os.close(image_fd)
                image_sha, image_bytes = hash_regular(evidence_image, 4 * 1024 * 1024 * 1024)
                record["evidence_image"] = {"path": "writable.img", "bytes": image_bytes, "sha256": image_sha}
            except (LaunchError, OSError) as exc:
                record["artifact_error"] = f"fixture evidence image sealing failed: {type(exc).__name__}: {exc}"
        if kind == "inspection" and proc is not None and proc.poll() is not None and source_image is not None:
            try:
                current_sha, current_bytes = hash_regular(source_image, 4 * 1024 * 1024 * 1024)
                record["source_image_after_sha256"] = current_sha
                record["source_image_after_bytes"] = current_bytes
                record["source_image_unchanged"] = current_sha == source_image_sha and current_bytes == 4 * 1024 * 1024 * 1024
                if not record["source_image_unchanged"]:
                    record["artifact_error"] = "inspection altered or changed the sealed source image"
            except (LaunchError, OSError) as exc:
                record["artifact_error"] = f"inspection source image post-read failed: {type(exc).__name__}: {exc}"
        terminal_inspection = next((item for item in control_records if item.get("schema") == "offline-proof-inspection-v1"), None)
        inspection_files = terminal_inspection.get("files") if type(terminal_inspection) is dict else None
        inspection_directories = terminal_inspection.get("directories") if type(terminal_inspection) is dict else None
        files_valid = (
            type(inspection_files) is list
            and all(
                type(row) is dict
                and set(row) == {"path", "bytes", "sha256"}
                and type(row["path"]) is str
                and row["path"].startswith("proof/")
                and type(row["bytes"]) is int
                and 0 <= row["bytes"] <= 4 * 1024 * 1024 * 1024
                and ((type(row["sha256"]) is str and re.fullmatch(r"[0-9a-f]{64}", row["sha256"]) is not None) if row["bytes"] <= 64 * 1024 * 1024 else row["sha256"] is None)
                for row in inspection_files
            )
            and [row["path"] for row in inspection_files] == sorted({row["path"] for row in inspection_files})
        )
        directories_valid = (
            type(inspection_directories) is list
            and all(type(path) is str and (path == "proof" or path.startswith("proof/")) for path in inspection_directories)
            and inspection_directories == sorted(set(inspection_directories))
            and {"proof", "proof/evidence", "proof/out"}.issubset(set(inspection_directories))
        )
        inspection_paths = {row["path"] for row in inspection_files} if files_valid else set()
        inspection_ok = (
            type(terminal_inspection) is dict
            and terminal_inspection.get("run_id") == run_id
            and terminal_inspection.get("source_run_id") == source_run_id
            and terminal_inspection.get("case_id") == case_id
            and terminal_inspection.get("manifest_sha256") == manifest["manifest_sha256"]
            and terminal_inspection.get("image_sha256") == source_image_sha
            and terminal_inspection.get("journal_replay") is False
            and terminal_inspection.get("mount_options") == "ro,noload,nodev,nosuid,noexec"
            and files_valid
            and directories_valid
            and {"proof/evidence/stdout.bin", "proof/evidence/stderr.bin"}.issubset(inspection_paths)
        )
        if not inspection_ok or not record.get("source_image_unchanged"):
            if kind == "inspection":
                record["artifact_error"] = record.get("artifact_error", "inspection result did not reconcile to the sealed source and read-only no-replay contract")
        if kind == "inspection":
            record["inspection_recorded"] = bool(inspection_ok)
        for name, data in artifact_buffers.items():
            if data:
                expected = artifact_expectations.get(name)
                if expected is None or expected.get("bytes") != len(data) or expected.get("sha256") != sha256(bytes(data)):
                    record["artifact_error"] = f"{name} export did not reconcile to trusted digest record"
                    continue
                write_exclusive(STORAGE / f"images/{'kernel.Image' if name == 'kernel' else 'initrd.img'}", bytes(data), 0o400)
        preparation_rows = [item for item in control_records if type(item) is dict and item.get("schema") == "offline-proof-preparation-export-v1"]
        shutdown_rows = [item for item in control_records if type(item) is dict and item.get("schema") == "offline-proof-preparation-shutdown-v1"]
        terminal_preparation = preparation_rows[0] if len(preparation_rows) == 1 else None
        terminal_shutdown = shutdown_rows[0] if len(shutdown_rows) == 1 else None
        completion_mono = time.monotonic()
        record["finished_unix"] = int(time.time())
        record["finished_monotonic"] = completion_mono
        record["elapsed_seconds"] = completion_mono - started_mono if started_mono is not None else None
        if deadline is not None and completion_mono > deadline:
            record["timed_out"] = True
        base_no_host_failure = not any(record.get(key) for key in ("host_exception", "timed_out", "interrupted", "transport_error", "artifact_error", "stop_evidence_journal_error")) and not overflowed and type(record.get("returncode")) is int and record["returncode"] == 0
        expected_shutdown = None if terminal_preparation is None else {
            "schema": "offline-proof-preparation-shutdown-v1",
            "status": "clean-shutdown-requested",
            "run_id": run_id,
            "manifest_sha256": manifest["manifest_sha256"],
            "runtime_identity_sha256": terminal_preparation.get("runtime_identity_sha256"),
            "rootfs_uuid": terminal_preparation.get("rootfs_uuid"),
            "kernel_sha256": terminal_preparation.get("kernel_sha256"),
            "initrd_sha256": terminal_preparation.get("initrd_sha256"),
        }
        preparation_clean = (
            kind == "preparation"
            and base_no_host_failure
            and record.get("serial_eof") is True
            and stop_evidence == {"requested": False}
            and terminal_preparation is not None
            and terminal_shutdown == expected_shutdown
        )
        if preparation_clean:
            final_record = terminal_preparation
            runtime_path = STORAGE / "images/runtime.img"
            try:
                if set(artifact_buffers) != {"kernel", "initrd"} or set(artifact_buffers) != set(artifact_expectations):
                    fail("preparation export lacks both exact artifact streams and digest expectations")
                for name in ("kernel", "initrd"):
                    actual = bytes(artifact_buffers[name])
                    expected = artifact_expectations[name]
                    if not actual or expected.get("bytes") != len(actual) or expected.get("sha256") != sha256(actual) or final_record.get(f"{name}_sha256") != sha256(actual):
                        fail(f"preparation {name} export did not reconcile to final record")
                runtime_sha, runtime_bytes = hash_regular(runtime_path, 8 * 1024 * 1024 * 1024)
                runtime_fd = os.open(runtime_path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
                try:
                    root_offset = final_record["root_partition_start_sector"] * 512
                    root_bytes = final_record["root_partition_sectors"] * 512
                    if root_offset < 512 or root_bytes < 512 or root_offset + root_bytes > runtime_bytes:
                        fail("preparation root partition geometry exceeds the retained prepared disk")
                    root_hash = hashlib.sha256()
                    offset = root_offset
                    while offset < root_offset + root_bytes:
                        block = os.pread(runtime_fd, min(CHUNK, root_offset + root_bytes - offset), offset)
                        if not block:
                            fail("preparation root partition ended before its exported geometry")
                        root_hash.update(block)
                        offset += len(block)
                finally:
                    os.close(runtime_fd)
                if deadline is not None and time.monotonic() > deadline:
                    record["timed_out"] = True
                    fail("preparation runtime-image digest exceeded the absolute lifecycle deadline")
                claim_raw = safe_read(STORAGE / "ledger/start-preparation-PREP-01.json", 1024 * 1024)
                descriptor = {**final_record, "runtime_image_sha256": runtime_sha, "runtime_image_bytes": runtime_bytes, "root_partition_sha256": root_hash.hexdigest(), "recorded_after_vm_exit": True, "preparation_claim_sha256": sha256(claim_raw)}
                write_exclusive(STORAGE / "images/runtime-descriptor.json", canonical(descriptor) + b"\n", 0o400)
                runtime_fd = os.open(runtime_path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
                try:
                    if not stat.S_ISREG(os.fstat(runtime_fd).st_mode):
                        fail("runtime image changed type before sealing")
                    os.fchmod(runtime_fd, 0o400)
                    os.fsync(runtime_fd)
                finally:
                    os.close(runtime_fd)
            except (LaunchError, OSError) as exc:
                record["artifact_error"] = f"preparation export reconciliation failed: {type(exc).__name__}: {exc}"
        completion_mono = time.monotonic()
        record["finished_unix"] = int(time.time())
        record["finished_monotonic"] = completion_mono
        record["elapsed_seconds"] = completion_mono - started_mono if started_mono is not None else None
        if deadline is not None and completion_mono > deadline:
            record["timed_out"] = True
        terminal_fixture = next((item for item in control_records if item.get("run_id") == run_id and item.get("status") in {"exited", "truncated"}), None)
        stop_ok = stop_evidence.get("requested") is False or (stop_evidence.get("reaped") is True and stop_evidence.get("late") is False and not any(stop_evidence.get(key) for key in ("stop_error", "signal_error", "reap_error", "persistence_error")))
        replay = record.get("host_claim_replay")
        h8_replay_valid = case_id != "H8-one-shot-replay" or (
            type(replay) is dict
            and set(replay) == {"schema", "original_run_id", "competing_run_id", "refusal", "original_claim_sha256", "retained_claim_sha256", "original_claim_unchanged"}
            and replay.get("schema") == "offline-proof-host-claim-replay-v1"
            and replay.get("original_run_id") == run_id
            and type(replay.get("competing_run_id")) is str
            and RUN_ID_RE.fullmatch(replay["competing_run_id"]) is not None
            and replay["competing_run_id"] != run_id
            and replay.get("refusal") == "exclusive-claim-already-exists"
            and replay.get("original_claim_sha256") == replay.get("retained_claim_sha256")
            and type(replay.get("original_claim_sha256")) is str
            and re.fullmatch(r"[0-9a-f]{64}", replay["original_claim_sha256"]) is not None
            and replay.get("original_claim_unchanged") is True
        )
        no_host_failure = not any(record.get(key) for key in ("host_exception", "timed_out", "interrupted", "stream_drain_incomplete", "transport_error", "artifact_error", "stop_evidence_journal_error", "unconfirmed_vm")) and not overflowed and record.get("returncode") == 0 and stop_ok and h8_replay_valid
        if no_host_failure and kind == "fixture" and terminal_fixture is not None and proof_stream_observed["stdout"] and proof_stream_observed["stderr"]:
            record["result"] = "bounded-evidence-captured"
        elif no_host_failure and preparation_clean and terminal_preparation is not None and not record.get("artifact_error"):
            record["result"] = "preparation-export-captured"
        elif no_host_failure and kind == "inspection" and inspection_ok and record.get("source_image_unchanged"):
            record["result"] = "inspection-evidence-captured"
        write_exclusive(run / "evidence/result.json", canonical(record) + b"\n", 0o400)
        print(json.dumps({"run_id": run_id, "result": record["result"], "returncode": record.get("returncode"), "timed_out": record.get("timed_out"), "interrupted": record.get("interrupted"), "operator_execution": "DENY", "evidence_dir": str(run / "evidence")}, sort_keys=True))
    return record
def run_vm(kind: str, case_id: str, run_id: str, manifest_path: Path, release_path: Path, release_sha: str, confirm: str, source_run_id: str | None = None) -> dict[str, Any]:
    check_storage()
    lock_path = STORAGE / "ledger/active-vm.lock"
    fd = os.open(lock_path, os.O_RDWR | getattr(os, "O_NOFOLLOW", 0))
    try:
        info = os.fstat(fd)
        if not stat.S_ISREG(info.st_mode) or info.st_uid != os.getuid() or stat.S_IMODE(info.st_mode) != 0o600 or info.st_nlink != 1 or info.st_size != 0:
            fail("active VM lock is not the fixed private empty file")
        try:
            fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as exc:
            raise LaunchError("another VM lifecycle is active; no retry is permitted") from exc
        orphan_path = STORAGE / "ledger/unconfirmed-vm.json"
        try:
            os.lstat(orphan_path)
        except FileNotFoundError:
            pass
        else:
            fail("unconfirmed prior VM ownership record blocks all further VM starts; preserve evidence and require external operator adjudication")
        return _run_vm_locked(kind, case_id, run_id, manifest_path, release_path, release_sha, confirm, source_run_id)
    finally:
        os.close(fd)


_INTERRUPTED = False

def _signal_handler(signum: int, _frame: Any) -> None:
    global _INTERRUPTED
    _INTERRUPTED = True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("show-policy")
    run = sub.add_parser("start")
    run.add_argument("--kind", required=True, choices=("preparation", "fixture", "inspection"))
    run.add_argument("--case-id", required=True)
    run.add_argument("--run-id", required=True)
    run.add_argument("--manifest", required=True, type=Path)
    run.add_argument("--controller-release", required=True, type=Path)
    run.add_argument("--release-sha256", required=True)
    run.add_argument("--confirm", required=True)
    run.add_argument("--source-run-id")
    args = parser.parse_args(argv)
    if args.command == "show-policy":
        print(safe_read(POLICY, 1024 * 1024).decode("utf-8"), end="")
        return 0
    record = run_vm(args.kind, args.case_id, args.run_id, args.manifest, args.controller_release, args.release_sha256, args.confirm, args.source_run_id)
    expected_result = {
        "preparation": "preparation-export-captured",
        "fixture": "bounded-evidence-captured",
        "inspection": "inspection-evidence-captured",
    }[args.kind]
    return 0 if type(record) is dict and record.get("result") == expected_result else 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, LaunchError, subprocess.SubprocessError) as exc:
        print(f"launch: {exc}", file=sys.stderr)
        raise SystemExit(2)
