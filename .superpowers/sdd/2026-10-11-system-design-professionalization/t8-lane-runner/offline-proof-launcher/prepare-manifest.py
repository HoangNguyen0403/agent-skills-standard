#!/usr/bin/env python3
"""Build a closed, content-addressed input tree from the frozen T8 artifacts.

This preparer reads only named project artifacts and the approved plan. It does
not import or execute operator.py, vendor code, graders, adapters, or packets.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import stat
import sys
from typing import Any

HERE = Path(__file__).absolute().parent
REPO = HERE.parents[4]
E_REL = PurePosixPath(".superpowers/sdd/2026-10-11-system-design-professionalization")
E = REPO.joinpath(*E_REL.parts)
PACKET_REL = E_REL / "t8-packets/prepared-78304406-ccdd-43d8-b5ec-69e76321de02"
PACKET_ROOT = REPO.joinpath(*PACKET_REL.parts)
NATIVE_MANIFEST_REL = PurePosixPath("benchmarks/evals/runs/all-v2.6.6-2026-10-12T04-14-02-441Z-16e2bee2/manifest.json")
PLAN_SHA256 = "da2f39921fe5fde68452733b75406db716d824e625e03d686f82256084b7dffe"
OPERATOR_SHA256 = "2aa558bc5750b362a54a960c92ff23311153c6428c372203c2e5a0f37f8f16d1"
REPORT_SHA256 = "28b92f8abb02feebb4adc07d7594ee9a25e146cc3ef13a7d9f5940ec318b982d"
MAX_SOURCE_BYTES = 2 * 1024 * 1024 * 1024
MAX_SOURCE_TOTAL = 8 * 1024 * 1024 * 1024
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
CLOSURE_AUTHORITY_HOLD = "preflight HOLD: missing independently approved full frozen-closure map (exact path, byte count, SHA-256, and class for every source, packet, grader, native-manifest, and guest-runtime file); current approved pins do not authorize candidate self-enrolment"

LAUNCHER_REL = E_REL / "t8-lane-runner/offline-proof-launcher"
LAUNCHER_FILES = (
    "backend.lock.json",
    "manifest.schema.json",
    "prepare-manifest.py",
    "provision.py",
    "launch.py",
    "protocol.py",
    "debian_contract.py",
    "guest-supervisor.py",
    "bootstrap.py",
    "policy.json",
    "harmless-fixture.py",
)


def fail(message: str) -> "NoReturn":
    raise ValueError(message)


def sha256(raw: bytes) -> str:
    return hashlib.sha256(raw).hexdigest()


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")


def unique_pairs(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            fail(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(raw: bytes, label: str) -> Any:
    try:
        return json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=unique_pairs, parse_constant=lambda value: fail(f"invalid JSON constant in {label}: {value}"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"invalid {label}") from exc


def safe_relative(value: str) -> PurePosixPath:
    path = PurePosixPath(value)
    if not value or path.is_absolute() or any(part in {"", ".", ".."} for part in path.parts) or "\\" in value:
        fail(f"unsafe relative path: {value!r}")
    return path


def open_directory_chain(path: Path) -> int:
    absolute = path.absolute()
    flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
    current = os.open(absolute.anchor, flags)
    try:
        for component in absolute.parts[1:]:
            next_fd = os.open(component, flags, dir_fd=current)
            if not stat.S_ISDIR(os.fstat(next_fd).st_mode):
                os.close(next_fd)
                fail(f"non-directory component in source path: {absolute}")
            os.close(current)
            current = next_fd
        return current
    except BaseException:
        os.close(current)
        raise


def read_regular(root: Path, relative: str, *, maximum: int = MAX_SOURCE_BYTES) -> bytes:
    rel = safe_relative(relative)
    directory_fd = open_directory_chain(root)
    fd = -1
    try:
        directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
        for part in rel.parts[:-1]:
            next_fd = os.open(part, directory_flags, dir_fd=directory_fd)
            if not stat.S_ISDIR(os.fstat(next_fd).st_mode):
                os.close(next_fd)
                fail(f"non-directory component in source path: {relative}")
            os.close(directory_fd)
            directory_fd = next_fd
        fd = os.open(rel.parts[-1], os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0), dir_fd=directory_fd)
        st = os.fstat(fd)
        if not stat.S_ISREG(st.st_mode) or st.st_nlink != 1 or st.st_size > maximum:
            fail(f"source is not a bounded singly-linked regular file: {relative}")
        chunks: list[bytes] = []
        remaining = st.st_size
        while remaining:
            chunk = os.read(fd, min(1024 * 1024, remaining))
            if not chunk:
                fail(f"short read: {relative}")
            chunks.append(chunk)
            remaining -= len(chunk)
        if os.read(fd, 1):
            fail(f"source grew during read: {relative}")
        after = os.fstat(fd)
        if (st.st_dev, st.st_ino, st.st_size, st.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns):
            fail(f"source identity changed during read: {relative}")
        return b"".join(chunks)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(directory_fd)


def record(root: Path, relative: str, source_class: str, *, maximum: int = MAX_SOURCE_BYTES) -> tuple[dict[str, Any], bytes]:
    raw = read_regular(root, relative, maximum=maximum)
    return {"path": relative, "bytes": len(raw), "sha256": sha256(raw), "class": source_class}, raw


def write_exclusive(root_fd: int, relative: str, raw: bytes, mode: int = 0o400) -> None:
    parts = safe_relative(relative).parts
    directory_fd = os.dup(root_fd)
    fd = -1
    try:
        directory_flags = os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0)
        for component in parts[:-1]:
            try:
                os.mkdir(component, mode=0o700, dir_fd=directory_fd)
                os.fsync(directory_fd)
            except FileExistsError:
                pass
            next_fd = os.open(component, directory_flags, dir_fd=directory_fd)
            if not stat.S_ISDIR(os.fstat(next_fd).st_mode):
                os.close(next_fd)
                fail(f"non-directory output component: {relative}")
            os.close(directory_fd)
            directory_fd = next_fd
        fd = os.open(parts[-1], os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), mode, dir_fd=directory_fd)
        view = memoryview(raw)
        while view:
            written = os.write(fd, view)
            if written <= 0:
                fail(f"short write: {relative}")
            view = view[written:]
        os.fsync(fd)
        os.fchmod(fd, mode)
        os.fsync(directory_fd)
    finally:
        if fd >= 0:
            os.close(fd)
        os.close(directory_fd)

def validate_hash(value: Any, label: str) -> str:
    if type(value) is not str or not SHA256_RE.fullmatch(value):
        fail(f"invalid SHA-256 in {label}")
    return value


SOURCE_MAP_CLASSES = {"operator-source-inert", "contract", "review", "adapter-source-inert", "assembler-source-inert", "binding", "inventory", "grader", "native-manifest", "packet"}
SOURCE_MAP_PATH = "authority/source-map.json"


def validate_source_map(raw: bytes, *, expected_raw_sha256: str, phase_context: dict[str, Any]) -> dict[str, Any]:
    if type(expected_raw_sha256) is not str or not SHA256_RE.fullmatch(expected_raw_sha256) or sha256(raw) != expected_raw_sha256:
        fail("source-map raw bytes do not match the independently supplied expected digest")
    if type(phase_context) is not dict or set(phase_context) != {"phase", "approved_plan_sha256"} or phase_context != {"phase": "preparation", "approved_plan_sha256": PLAN_SHA256}:
        fail("source-map phase context is not the exact approved preparation context")
    document = read_json(raw, "independent source map")
    if type(document) is not dict or set(document) != {"schema", "phase", "approved_plan_sha256", "files"} or document.get("schema") != "offline-proof-source-map-v1" or document.get("phase") != phase_context["phase"] or document.get("approved_plan_sha256") != phase_context["approved_plan_sha256"]:
        fail("independent source-map schema or phase binding is invalid")
    rows = document.get("files")
    if type(rows) is not list:
        fail("independent source-map files must be an ordered array")
    seen: set[str] = set()
    previous = ""
    for row in rows:
        if type(row) is not dict or set(row) != {"path", "class", "bytes", "sha256"}:
            fail("independent source-map row shape is invalid")
        path = row["path"]
        if type(path) is not str or safe_relative(path).as_posix() != path or path == SOURCE_MAP_PATH:
            fail("independent source-map path is unsafe or recursively self-listed")
        if path in seen or path <= previous:
            fail("independent source-map paths must be unique and strictly ordered")
        if type(row["class"]) is not str or row["class"] not in SOURCE_MAP_CLASSES or type(row["bytes"]) is not int or row["bytes"] < 0 or type(row["sha256"]) is not str or not SHA256_RE.fullmatch(row["sha256"]):
            fail("independent source-map row contains an invalid class, byte count or digest")
        seen.add(path)
        previous = path
    return {"raw_sha256": expected_raw_sha256, "rows": rows, "phase_context": phase_context}


def _check_source_map_rows(validated: dict[str, Any], records: list[dict[str, Any]]) -> None:
    actual = sorted(({"path": row["path"], "class": row["class"], "bytes": row["bytes"], "sha256": row["sha256"]} for row in records), key=lambda row: row["path"])
    if validated["rows"] != actual:
        expected_by_path = {row["path"]: row for row in validated["rows"]}
        actual_by_path = {row["path"]: row for row in actual}
        missing = sorted(set(expected_by_path) - set(actual_by_path))
        extra = sorted(set(actual_by_path) - set(expected_by_path))
        changed = sorted(path for path in set(expected_by_path) & set(actual_by_path) if expected_by_path[path] != actual_by_path[path])
        fail(f"staged source closure differs from independently approved map: missing={missing[:8]} extra={extra[:8]} changed={changed[:8]}")


def read_source_map(path: Path, maximum: int = 64 * 1024 * 1024) -> bytes:
    return read_regular(path.parent, path.name, maximum=maximum)

def record_approved_source(root: Path, relative: str, source_class: str, expected_by_path: dict[str, dict[str, Any]], *, maximum: int = MAX_SOURCE_BYTES) -> tuple[dict[str, Any], bytes]:
    repo_relative = str(PurePosixPath(root.relative_to(REPO).as_posix()) / safe_relative(relative))
    expected = expected_by_path.get(repo_relative)
    if expected is None or expected["class"] != source_class or expected["bytes"] > maximum:
        fail(f"source-map membership/class/byte bound refuses read: {repo_relative}")
    item, raw = record(REPO, repo_relative, source_class, maximum=expected["bytes"])
    if item != expected:
        fail(f"source bytes differ from independently approved identity: {repo_relative}")
    return item, raw

def build_closure(source_map_raw: bytes, *, expected_source_map_sha256: str) -> tuple[dict[str, Any], dict[str, bytes]]:
    validated_map = validate_source_map(source_map_raw, expected_raw_sha256=expected_source_map_sha256, phase_context={"phase": "preparation", "approved_plan_sha256": PLAN_SHA256})
    expected_by_path = {row["path"]: row for row in validated_map["rows"]}
    files: dict[str, bytes] = {}
    source_records: list[dict[str, Any]] = []
    packet_records: list[dict[str, Any]] = []
    grader_records: list[dict[str, Any]] = []
    total = 0
    def add(root: Path, relative: str, source_class: str, group: list[dict[str, Any]], *, maximum: int = MAX_SOURCE_BYTES) -> bytes:
        nonlocal total
        repo_relative = str(PurePosixPath(root.relative_to(REPO).as_posix()) / safe_relative(relative))
        item, raw = record_approved_source(root, relative, source_class, expected_by_path, maximum=maximum)
        if repo_relative in files:
            fail(f"duplicate staged source path: {repo_relative}")
        total += len(raw)
        if total > MAX_SOURCE_TOTAL:
            fail("staged source closure exceeds 8 GiB")
        files[repo_relative] = raw
        group.append(item)
        return raw

    fixed_sources = [
        (str(E_REL / "g2-instrumented-operator/operator.py"), "operator-source-inert"),
        (str(E_REL / "qf5-collector-report.md"), "review"),
        (str(E_REL / "t8-lane-runner/offline-proof-launcher/approved-plan.md"), "review"),
        (str(E_REL / "t8-lane-runner/reconstruction-wp5-fix2-review.md"), "review"),
        (str(E_REL / "t8-lane-runner/reconstruction-wp6-review.md"), "review"),
        (str(E_REL / "t8-lane-runner/reconstruction-qf5a-fix4-review.md"), "review"),
        (str(E_REL / "t8-execution-contract-draft.md"), "contract"),
        (str(E_REL / "task-7-index-fix-candidate-manifest.json"), "contract"),
        (str(E_REL / "g2-renewal-result.json"), "contract"),
        (str(E_REL / "t8-lane-runner/assemble-grader.py"), "assembler-source-inert"),
        (str(E_REL / "t8-lane-runner/lane-runner.ts"), "adapter-source-inert"),
        (str(E_REL / "t8-lane-runner/run-native.ts"), "adapter-source-inert"),
        ("scripts/evals/execute.ts", "adapter-source-inert"),
    ]
    for relative, source_class in fixed_sources:
        add(REPO, relative, source_class, source_records)

    launcher_root = REPO.joinpath(*LAUNCHER_REL.parts)
    for name in LAUNCHER_FILES:
        add(REPO, str(LAUNCHER_REL / name), "adapter-source-inert", source_records)

    analysis = PACKET_ROOT / "analysis"
    analysis_rel = str(PACKET_REL / "analysis")
    inventory_raw = add(REPO, f"{analysis_rel}/packet-inventory.json", "inventory", source_records)
    package_raw = add(REPO, f"{analysis_rel}/package-bindings.json", "binding", source_records)
    native_raw = add(REPO, f"{analysis_rel}/native-bindings.json", "binding", source_records)
    blind_raw = add(REPO, f"{analysis_rel}/blind-arm-map.json", "binding", source_records)
    inventory = read_json(inventory_raw, "packet inventory")
    package_bindings = read_json(package_raw, "package bindings")
    native_bindings = read_json(native_raw, "native bindings")
    blind_map = read_json(blind_raw, "blind arm map")
    if type(inventory) is not dict or inventory.get("schema") != "t8-packet-inventory-v1" or inventory.get("packetCount") != 463:
        fail("frozen packet inventory schema/count mismatch")
    if type(package_bindings) is not dict or package_bindings.get("schema") != "t8-package-source-bindings-v1" or type(package_bindings.get("lanes")) is not list or len(package_bindings["lanes"]) != 114:
        fail("package binding schema/count mismatch")
    if type(native_bindings) is not dict or native_bindings.get("schema") != "t8-native-source-bindings-v1" or type(native_bindings.get("lanes")) is not list or len(native_bindings["lanes"]) != 349:
        fail("native binding schema/count mismatch")
    if type(blind_map) is not dict or not blind_map:
        fail("frozen blind map is empty or malformed")
    inventory_rows = inventory.get("packets")
    if type(inventory_rows) is not list or len(inventory_rows) != 463:
        fail("packet inventory rows do not match declared count")
    by_path: dict[str, dict[str, Any]] = {}
    for row in inventory_rows:
        if type(row) is not dict or set(row) != {"path", "sha256", "byteLength", "kind"}:
            fail("packet inventory row shape mismatch")
        path = safe_relative(row["path"]).as_posix()
        validate_hash(row["sha256"], path)
        if type(row["byteLength"]) is not int or row["byteLength"] < 0 or row["kind"] not in {"package", "native"} or path in by_path:
            fail(f"invalid or duplicate packet inventory row: {path}")
        by_path[path] = row

    ordered_rows: list[tuple[dict[str, Any], str]] = []
    for kind, binding_rows, prefix in (("package", package_bindings["lanes"], "full-package/"), ("native", native_bindings["lanes"], "native/")):
        for row in binding_rows:
            if type(row) is not dict:
                fail(f"{kind} binding row is not an object")
            path = safe_relative(row.get("packetPath", "")).as_posix()
            expected = by_path.get(path)
            if expected is None or expected["kind"] != kind or not path.startswith(prefix):
                fail(f"binding points outside its frozen {kind} packet class: {path}")
            if validate_hash(row.get("packetSha256"), path) != expected["sha256"] or row.get("byteLength") != expected["byteLength"]:
                fail(f"binding and inventory disagree for {path}")
            ordered_rows.append((expected, path))
    if len(ordered_rows) != 463 or len({path for _, path in ordered_rows}) != 463 or {path for _, path in ordered_rows} != set(by_path):
        fail("package/native bindings do not form the exact 463-packet closure")
    for row, relative in ordered_rows:
        packet_path = str(PACKET_REL / relative)
        packet_item, raw = record_approved_source(REPO, packet_path, "packet", expected_by_path)
        if len(raw) != row["byteLength"] or packet_item["sha256"] != row["sha256"]:
            fail(f"packet bytes differ from independently approved identity/inventory: {relative}")
        if packet_path in files:
            fail(f"duplicate packet path: {relative}")
        total += len(raw)
        if total > MAX_SOURCE_TOTAL:
            fail("staged source closure exceeds 8 GiB")
        files[packet_path] = raw
        packet_records.append(packet_item)

    grader_rel = str(PACKET_REL / "grader")
    index_relative = f"{grader_rel}/index.json"
    protocol_relative = f"{grader_rel}/protocol.json"
    index_raw = add(REPO, index_relative, "grader", grader_records)
    add(REPO, protocol_relative, "grader", grader_records)
    index = read_json(index_raw, "grader index")
    if type(index) is not dict or index.get("schema") != "blinded-grader-inventory-v1" or index.get("status") != "unanswered; no grades" or type(index.get("pairFiles")) is not list:
        fail("frozen grader index contract mismatch")
    pairs = index["pairFiles"]
    if len(pairs) != 19 or len(set(pairs)) != 19:
        fail("frozen grader index must bind exactly 19 unique pair files")
    expected_grader_names = {"index.json", "protocol.json"}
    for pair in pairs:
        pair_path = safe_relative(pair)
        if len(pair_path.parts) != 2 or pair_path.parts[0] != "grader" or not pair_path.name.startswith("grader-pair-") or not pair_path.name.endswith(".json"):
            fail(f"invalid frozen pair path: {pair}")
        relative = f"{grader_rel}/{pair_path.name}"
        add(REPO, relative, "grader", grader_records)
        expected_grader_names.add(pair_path.name)
    actual_names: set[str] = set()
    packet_fd = open_directory_chain(PACKET_ROOT)
    grader_fd = -1
    try:
        grader_fd = os.open("grader", os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=packet_fd)
        grader_info = os.fstat(grader_fd)
        if not stat.S_ISDIR(grader_info.st_mode):
            fail("frozen grader root is not a directory")
        for name in os.listdir(grader_fd):
            entry_info = os.stat(name, dir_fd=grader_fd, follow_symlinks=False)
            if not stat.S_ISREG(entry_info.st_mode) or stat.S_ISLNK(entry_info.st_mode) or entry_info.st_nlink != 1:
                fail("grader directory contains a non-regular or multiply linked entry")
            actual_names.add(name)
    finally:
        if grader_fd >= 0:
            os.close(grader_fd)
        os.close(packet_fd)
    if actual_names != expected_grader_names:
        fail("grader directory differs from exact index/protocol/pair closure")

    native_manifest_path = str(NATIVE_MANIFEST_REL)
    native_manifest_record, native_manifest_raw = record_approved_source(REPO, native_manifest_path, "native-manifest", expected_by_path)
    _check_source_map_rows(validated_map, source_records + packet_records + grader_records + [native_manifest_record])
    files[native_manifest_path] = native_manifest_raw
    total += len(native_manifest_raw)
    if total > MAX_SOURCE_TOTAL:
        fail("staged source closure exceeds 8 GiB")
    if len(source_map_raw) > 64 * 1024 * 1024 or SOURCE_MAP_PATH in files:
        fail("independent source map exceeds its bound or collides with a staged path")
    files[SOURCE_MAP_PATH] = source_map_raw
    total += len(source_map_raw)
    if total > MAX_SOURCE_TOTAL:
        fail("staged source closure and authority map exceed 8 GiB")


    if sha256(files[str(E_REL / "g2-instrumented-operator/operator.py")]) != OPERATOR_SHA256:
        fail("operator pin mismatch; manifest creation refused")
    if sha256(files[str(E_REL / "qf5-collector-report.md")]) != REPORT_SHA256:
        fail("collector report pin mismatch; manifest creation refused")
    if sha256(files[str(E_REL / "t8-lane-runner/offline-proof-launcher/approved-plan.md")]) != PLAN_SHA256:
        fail("approved plan pin mismatch; manifest creation refused")

    source_by_path = {row["path"]: row["sha256"] for row in source_records}
    source_pins = {
        "operator_sha256": OPERATOR_SHA256,
        "collector_report_sha256": REPORT_SHA256,
        "assembler_sha256": source_by_path[str(E_REL / "t8-lane-runner/assemble-grader.py")],
        "adapter_sha256": source_by_path[str(E_REL / "t8-lane-runner/lane-runner.ts")],
        "native_entry_sha256": source_by_path[str(E_REL / "t8-lane-runner/run-native.ts")],
        "candidate_sha256": source_by_path[str(E_REL / "task-7-index-fix-candidate-manifest.json")],
        "renewal_sha256": source_by_path[str(E_REL / "g2-renewal-result.json")],
        "contract_sha256": source_by_path[str(E_REL / "t8-execution-contract-draft.md")],
    }
    inventory_sha = validate_hash(inventory.get("inventorySha256"), "inventory")
    manifest: dict[str, Any] = {
        "schema": "offline-proof-manifest-v1",
        "approved_plan_sha256": PLAN_SHA256,
        "source_pins": source_pins,
        "packet_inventory": {
            "path": "analysis/packet-inventory.json",
            "staged_path": str(PACKET_REL / "analysis/packet-inventory.json"),
            "sha256": sha256(inventory_raw),
            "inventory_sha256": inventory_sha,
            "package_count": 114,
            "native_count": 349,
            "total_count": 463,
        },
        "source_files": source_records,
        "packet_files": packet_records,
        "grader_files": grader_records,
        "native_manifest": native_manifest_record,
        "source_map": {
            "path": SOURCE_MAP_PATH,
            "raw_sha256": validated_map["raw_sha256"],
            "phase_context": validated_map["phase_context"],
        },
        "guest_runtime": {
            "architecture": "aarch64",
            "kernel_release": "6.12.113-1",
            "python": "3.13.5-2+deb13u5",
            "libseccomp": "2.6.0-2",
            "ext4_tools": "1.47.2-3+b12",
            "package_versions": {
                "linux-image-6.12.113+deb13-arm64": "6.12.113-1",
                "python3.13": "3.13.5-2+deb13u5",
                "libseccomp2": "2.6.0-2",
                "e2fsprogs": "1.47.2-3+b12",
                "cloud-init": "25.1.4-1+deb13u1",
                "systemd": "257.13-1~deb13u1",
            },
            "rootfs_sha512": "cef8d43df3b850235cdd477e248ab6af14cc706fd0869d7b9defd82ce82f70839c031459be884ef2d3647f8bcc4df142e083b6291f334c887e6efaee6c1f15d1",
        },
        "execution_policy": {
            "operator_execution": "DENY",
            "permitted_target": "harmless-fixture.py",
            "host_shares": False,
            "guest_network": False,
            "vsock": False,
            "rosetta": False,
            "gpu": False,
            "cgroup_pids_max": 3,
            "target_control_fd": False,
            "automatic_retry": False,
        },
    }
    manifest["manifest_sha256"] = sha256(canonical_json(manifest))
    return manifest, files


def _assert_private_existing_dir(fd: int, path: Path) -> None:
    st = os.fstat(fd)
    if not stat.S_ISDIR(st.st_mode) or stat.S_IMODE(st.st_mode) != 0o700 or st.st_uid != os.getuid():
        fail(f"output parent must be an existing owner-only 0700 directory: {path}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path, help="new child of the already-provisioned private build directory")
    parser.add_argument("--source-map", required=True, type=Path, help="externally approved raw frozen-closure map")
    parser.add_argument("--source-map-sha256", required=True, help="independently acknowledged raw source-map SHA-256")
    args = parser.parse_args(argv)
    output = args.output_dir.absolute()
    source_map_raw = read_source_map(args.source_map)
    manifest, files = build_closure(source_map_raw, expected_source_map_sha256=args.source_map_sha256)
    parent_fd = open_directory_chain(output.parent)
    output_fd = -1
    try:
        _assert_private_existing_dir(parent_fd, output.parent)
        os.mkdir(output.name, mode=0o700, dir_fd=parent_fd)
        output_fd = os.open(output.name, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0) | getattr(os, "O_NOFOLLOW", 0), dir_fd=parent_fd)
        output_info = os.fstat(output_fd)
        if not stat.S_ISDIR(output_info.st_mode) or stat.S_IMODE(output_info.st_mode) != 0o700 or output_info.st_uid != os.getuid():
            fail("new output directory identity differs from the owner-only contract")
        os.fsync(parent_fd)
        for relative, raw in sorted(files.items()):
            write_exclusive(output_fd, f"closure/{relative}", raw)
        write_exclusive(output_fd, "manifest.json", canonical_json(manifest) + b"\n", mode=0o400)
        os.fsync(output_fd)
    finally:
        if output_fd >= 0:
            os.close(output_fd)
        os.close(parent_fd)
    print(json.dumps({"manifest_sha256": manifest["manifest_sha256"], "source_file_count": len(manifest["source_files"]), "packet_file_count": len(manifest["packet_files"]), "grader_file_count": len(manifest["grader_files"]), "operator_execution": "DENY", "output_dir": str(output)}, sort_keys=True))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError) as exc:
        print(f"prepare-manifest: {exc}", file=sys.stderr)
        raise SystemExit(2)
