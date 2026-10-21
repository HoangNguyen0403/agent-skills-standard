#!/usr/bin/python3.13
"""Trusted non-root bootstrap: authenticate inert manifest, install seccomp, then load one harmless fixture."""
from __future__ import annotations

import argparse
import ctypes
import errno
import hashlib
import json
import os
from pathlib import Path
import platform
import runpy
import signal
import socket
import stat
import threading
import re

ROOT = Path("/opt/offline-proof")
FIXTURE = ROOT / "harmless-fixture.py"
MANIFEST = ROOT / "manifest.json"
RUNTIME = ROOT / "runtime.json"
_LIBSECCOMP_FD = -1
_LIBSECCOMP: ctypes.CDLL | None = None
RUN_GATE_PREFIX = b"OFFLINE-PROOF-GO\x00"
MAX_MANIFEST = 64 * 1024 * 1024
MAX_FIXTURE = 2 * 1024 * 1024
SCMP_ACT_ALLOW = 0x7FFF0000
SCMP_ACT_ERRNO = 0x00050000
SCMP_CMP_MASKED_EQ = 7


class ArgCmp(ctypes.Structure):
    _fields_ = [("arg", ctypes.c_uint), ("op", ctypes.c_int), ("datum_a", ctypes.c_uint64), ("datum_b", ctypes.c_uint64)]


class BootstrapError(RuntimeError):
    pass


def fail(message: str) -> "NoReturn":
    raise BootstrapError(message)


def strict_pairs(pairs: list[tuple[str, object]]) -> dict[str, object]:
    result: dict[str, object] = {}
    for key, value in pairs:
        if key in result:
            fail(f"duplicate manifest key: {key}")
        result[key] = value
    return result


def read_regular(path: Path, limit: int) -> bytes:
    fd = os.open(path, os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0))
    try:
        before = os.fstat(fd)
        if not stat.S_ISREG(before.st_mode) or before.st_size > limit:
            fail(f"unbounded or non-file input: {path}")
        data = bytearray()
        while len(data) <= limit:
            block = os.read(fd, min(1024 * 1024, limit + 1 - len(data)))
            if not block:
                break
            data.extend(block)
        after = os.fstat(fd)
        if len(data) > limit or len(data) != before.st_size or (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns):
            fail(f"bounded input changed or exceeded its limit: {path}")
        return bytes(data)
    finally:
        os.close(fd)


def load_manifest(expected_sha256: str) -> dict[str, object]:
    raw = read_regular(MANIFEST, MAX_MANIFEST)
    try:
        manifest = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=strict_pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BootstrapError("manifest JSON invalid") from exc
    if type(manifest) is not dict or manifest.get("schema") != "offline-proof-manifest-v1":
        fail("manifest schema mismatch")
    supplied = manifest.get("manifest_sha256")
    body = dict(manifest)
    body.pop("manifest_sha256", None)
    actual = hashlib.sha256(json.dumps(body, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")).hexdigest()
    if type(supplied) is not str or supplied != actual or actual != expected_sha256:
        fail("manifest digest does not match independently supplied run binding")
    policy = manifest.get("execution_policy")
    if type(policy) is not dict or policy.get("operator_execution") != "DENY" or policy.get("permitted_target") != "harmless-fixture.py" or policy.get("target_control_fd") is not False:
        fail("manifest execution policy does not deny operator execution")
    return manifest

def load_runtime_identity(manifest: dict[str, object], expected_sha256: str) -> dict[str, object]:
    raw = read_regular(RUNTIME, 64 * 1024)
    try:
        identity = json.loads(raw.decode("utf-8", "strict"), object_pairs_hook=strict_pairs)
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise BootstrapError("runtime identity JSON invalid") from exc
    keys = {"schema", "manifest_sha256", "architecture", "kernel_release", "rootfs_uuid", "libseccomp_path", "libseccomp_sha256", "libseccomp_bytes", "libseccomp_package_version", "package_versions"}
    if type(identity) is not dict or set(identity) != keys:
        fail("runtime identity schema mismatch")
    canonical = json.dumps(identity, sort_keys=True, ensure_ascii=False, separators=(",", ":"), allow_nan=False).encode("utf-8")
    if hashlib.sha256(canonical).hexdigest() != expected_sha256:
        fail("runtime identity differs from the independently supplied prepared descriptor")
    runtime = manifest.get("guest_runtime")
    if type(runtime) is not dict or type(runtime.get("package_versions")) is not dict:
        fail("manifest guest runtime package closure malformed")
    packages = runtime["package_versions"]
    kernel_names = [name.removeprefix("linux-image-") for name in packages if type(name) is str and name.startswith("linux-image-")]
    if (
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
        or not 20 <= identity["libseccomp_bytes"] <= 16 * 1024 * 1024
    ):
        fail("runtime identity does not match the fixed guest manifest and package closure")
    return identity


def expected_fixture_hash(manifest: dict[str, object]) -> str:
    rows = manifest.get("source_files")
    if type(rows) is not list:
        fail("manifest source closure missing")
    matches = [row for row in rows if type(row) is dict and type(row.get("path")) is str and row["path"].endswith("/offline-proof-launcher/harmless-fixture.py")]
    if len(matches) != 1 or type(matches[0].get("sha256")) is not str or not re.fullmatch(r"[0-9a-f]{64}", matches[0]["sha256"]):
        fail("manifest does not bind exactly one harmless fixture")
    return matches[0]["sha256"]


def await_supervisor_gate(run_id: str, manifest_sha: str) -> None:
    expected = RUN_GATE_PREFIX + run_id.encode("ascii") + b"\x00" + manifest_sha.encode("ascii") + b"\n"
    got = bytearray()
    while len(got) < len(expected):
        block = os.read(0, len(expected) - len(got))
        if not block:
            fail("trusted supervisor did not release the child")
        got.extend(block)
    if bytes(got) != expected:
        fail("trusted supervisor gate mismatch")
    os.close(0)


def drop_privileges() -> None:
    if os.geteuid() != 0:
        fail("trusted bootstrap must start with the configured root identity")
    last_cap = int(Path("/proc/sys/kernel/cap_last_cap").read_text(encoding="ascii").strip())
    if not 0 <= last_cap <= 63:
        fail("kernel capability range is outside the reviewed bound")
    libc = ctypes.CDLL("/lib/aarch64-linux-gnu/libc.so.6", use_errno=True)
    libc.prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong]
    libc.prctl.restype = ctypes.c_int
    for capability in range(last_cap + 1):
        if libc.prctl(24, capability, 0, 0, 0) != 0:
            fail(f"cannot drop capability bounding entry {capability}: {ctypes.get_errno()}")
    if libc.prctl(47, 4, 0, 0, 0) != 0:
        fail(f"cannot clear ambient capabilities: {ctypes.get_errno()}")
    if libc.prctl(38, 1, 0, 0, 0) != 0:
        fail(f"cannot set no_new_privs before target load: {ctypes.get_errno()}")
    os.setgroups([])
    os.setresgid(65532, 65532, 65532)
    os.setresuid(65532, 65532, 65532)
    if os.geteuid() != 65532 or os.getegid() != 65532:
        fail("trusted bootstrap failed to assume the non-root fixture identity")

def verify_process_confinement() -> None:
    if platform.machine() != "aarch64" or os.uname().machine != "aarch64":
        fail("guest syscall architecture is not AArch64")
    if os.geteuid() == 0 or os.getegid() == 0:
        fail("target must be non-root")
    status = Path("/proc/self/status").read_text(encoding="ascii")
    expected_zero = {"CapInh", "CapPrm", "CapEff", "CapBnd", "CapAmb"}
    values = {}
    for line in status.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            if key in expected_zero or key == "NoNewPrivs":
                values[key] = value.strip()
    if any(values.get(key) != "0000000000000000" for key in expected_zero) or values.get("NoNewPrivs") != "1":
        fail("capabilities or no_new_privs invariant failed")


def _resolve(lib: ctypes.CDLL, name: str) -> int:
    number = lib.seccomp_syscall_resolve_name(name.encode("ascii"))
    if number < 0:
        fail(f"pinned libseccomp cannot resolve required syscall {name}")
    return number


def install_seccomp(runtime_identity: dict[str, object]) -> None:
    global _LIBSECCOMP_FD, _LIBSECCOMP
    fd = 3
    try:
        before = os.fstat(fd)
        expected_bytes = runtime_identity["libseccomp_bytes"]
        if not stat.S_ISREG(before.st_mode) or before.st_uid != 0 or before.st_mode & 0o022 or type(expected_bytes) is not int or before.st_size != expected_bytes:
            fail("inherited libseccomp descriptor ownership, permissions or size differs from prepared identity")
        digest = hashlib.sha256()
        offset = 0
        while offset < expected_bytes:
            block = os.pread(fd, min(1024 * 1024, expected_bytes - offset), offset)
            if not block:
                fail("inherited libseccomp descriptor ended before its authenticated size")
            offset += len(block)
            digest.update(block)
        after = os.fstat(fd)
        if (before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns) != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns) or digest.hexdigest() != runtime_identity["libseccomp_sha256"]:
            fail("inherited libseccomp object differs from the immutable preparation identity")
        header = os.pread(fd, 20, 0)
        if len(header) != 20 or header[:6] != b"\x7fELF\x02\x01" or int.from_bytes(header[18:20], "little") != 183:
            fail("prepared libseccomp is not an AArch64 ELF64 little-endian object")
        loader_path = "/proc/self/fd/3"
        projected = os.stat(loader_path, follow_symlinks=False)
        if not stat.S_ISREG(projected.st_mode) or (projected.st_dev, projected.st_ino, projected.st_size, projected.st_mode, projected.st_uid, projected.st_gid) != (before.st_dev, before.st_ino, before.st_size, before.st_mode, before.st_uid, before.st_gid):
            fail("single-file loader projection is not the inherited authenticated libseccomp object")
        lib = ctypes.CDLL(loader_path, mode=ctypes.RTLD_LOCAL)
        os.set_inheritable(fd, False)
    except BaseException:
        try:
            os.close(fd)
        except OSError:
            pass
        raise
    _LIBSECCOMP_FD = fd
    _LIBSECCOMP = lib
    lib.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
    lib.seccomp_syscall_resolve_name.restype = ctypes.c_int
    lib.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
    lib.seccomp_rule_add.restype = ctypes.c_int
    lib.seccomp_rule_add_array.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint, ctypes.POINTER(ArgCmp)]
    lib.seccomp_rule_add_array.restype = ctypes.c_int
    lib.seccomp_load.argtypes = [ctypes.c_void_p]
    lib.seccomp_load.restype = ctypes.c_int
    lib.seccomp_release.argtypes = [ctypes.c_void_p]
    lib.seccomp_release.restype = None

    libc = ctypes.CDLL("/lib/aarch64-linux-gnu/libc.so.6", use_errno=True)
    libc.prctl.argtypes = [ctypes.c_int, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong, ctypes.c_ulong]
    libc.prctl.restype = ctypes.c_int
    PR_SET_NO_NEW_PRIVS = 38
    if libc.prctl(PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0) != 0:
        fail(f"PR_SET_NO_NEW_PRIVS failed: {ctypes.get_errno()}")

    lib.seccomp_init.argtypes = [ctypes.c_uint32]
    lib.seccomp_init.restype = ctypes.c_void_p
    ctx = lib.seccomp_init(SCMP_ACT_ALLOW)
    if not ctx:
        fail("seccomp_init failed")
    action = SCMP_ACT_ERRNO | errno.EPERM
    denied = (
        "execve", "execveat", "fork", "vfork", "ptrace", "process_vm_readv", "process_vm_writev",
        "unshare", "setns", "mount", "umount2", "pivot_root", "chroot", "open_by_handle_at",
        "socket", "socketpair", "connect", "bind", "listen", "accept", "accept4",
        "kill", "tkill", "tgkill", "pidfd_send_signal", "rt_sigqueueinfo", "rt_tgsigqueueinfo",
        "setitimer", "timer_create", "timer_settime", "timer_gettime", "timer_getoverrun", "timer_delete",
        "bpf", "perf_event_open", "userfaultfd", "io_uring_setup", "io_uring_enter", "io_uring_register",
        "keyctl", "add_key", "request_key", "kexec_load", "kexec_file_load", "init_module", "finit_module", "delete_module",
        "reboot", "swapon", "swapoff", "acct", "prctl", "seccomp", "setuid", "setgid", "setreuid", "setregid", "setresuid", "setresgid",
    )
    try:
        for name in denied:
            result = lib.seccomp_rule_add(ctx, action, _resolve(lib, name), 0)
            if result != 0:
                fail(f"cannot add fail-closed seccomp denial for {name}: {result}")
        clone = _resolve(lib, "clone")
        CLONE_THREAD = 0x00010000
        no_thread = ArgCmp(0, SCMP_CMP_MASKED_EQ, CLONE_THREAD, 0)
        if lib.seccomp_rule_add_array(ctx, action, clone, 1, ctypes.byref(no_thread)) != 0:
            fail("cannot deny process-form clone")
        allowed_thread_flags = 0x00000100 | 0x00000200 | 0x00000400 | 0x00000800 | CLONE_THREAD | 0x00040000 | 0x00080000 | 0x00100000 | 0x00200000 | 0x00400000 | 0x01000000
        for bit in range(64):
            flag = 1 << bit
            if allowed_thread_flags & flag:
                continue
            comparison = ArgCmp(0, SCMP_CMP_MASKED_EQ, flag, flag)
            if lib.seccomp_rule_add_array(ctx, action, clone, 1, ctypes.byref(comparison)) != 0:
                fail("cannot deny an unsupported clone flag bit")
        clone3 = _resolve(lib, "clone3")
        if lib.seccomp_rule_add(ctx, SCMP_ACT_ERRNO | errno.ENOSYS, clone3, 0) != 0:
            fail("cannot force clone3 ENOSYS")
        if lib.seccomp_load(ctx) != 0:
            fail(f"seccomp_load failed: {ctypes.get_errno()}")
    finally:
        lib.seccomp_release(ctx)


def run_fixture(case_id: str, output_root: str, run_id: str, manifest_sha256: str, runtime_identity_sha256: str) -> int:
    await_supervisor_gate(run_id, manifest_sha256)
    manifest = load_manifest(manifest_sha256)
    runtime_identity = load_runtime_identity(manifest, runtime_identity_sha256)
    fixture_hash = expected_fixture_hash(manifest)
    raw = read_regular(FIXTURE, MAX_FIXTURE)
    if hashlib.sha256(raw).hexdigest() != fixture_hash:
        fail("harmless fixture bytes differ from the sealed manifest")
    fixture_code = compile(raw, str(FIXTURE), "exec", dont_inherit=True)
    drop_privileges()
    verify_process_confinement()
    import threading as _threading
    import socket as _socket
    import signal as _signal
    if _threading is not threading or _socket is not socket or _signal is not signal:
        fail("trusted module preload identity mismatch")
    install_seccomp(runtime_identity)
    fixture_globals: dict[str, object] = {"__name__": "offline_proof_fixture", "__file__": str(FIXTURE), "__package__": None}
    exec(fixture_code, fixture_globals, fixture_globals)
    fixture_main = fixture_globals.get("main")
    if not callable(fixture_main):
        fail("sealed fixture entrypoint is missing")
    return int(fixture_main(["--case", case_id, "--output-root", output_root]))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", required=True, choices=("H1-positive-isolation", "H2-aggregate-storage", "H3-stdout-overflow", "H4-stderr-overflow", "H5-deadline", "H6-host-interruption", "H7-guest-transport-failure", "H8-one-shot-replay"))
    parser.add_argument("--output-root", required=True)
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--manifest-sha256", required=True)
    parser.add_argument("--runtime-identity-sha256", required=True)
    args = parser.parse_args(argv)
    if type(args.run_id) is not str or not re.fullmatch(r"[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}", args.run_id) or args.output_root != f"/proof/out/{args.run_id}" or not re.fullmatch(r"[0-9a-f]{64}", args.manifest_sha256) or not re.fullmatch(r"[0-9a-f]{64}", args.runtime_identity_sha256):
        fail("run arguments are outside fixed proof scope")
    return run_fixture(args.case, args.output_root, args.run_id, args.manifest_sha256, args.runtime_identity_sha256)


if __name__ == "__main__":
    try:
        status = main()
    except BaseException as exc:
        os.write(2, (f"bootstrap: {type(exc).__name__}: {exc}\n").encode("utf-8", "replace")[:4096])
        raise SystemExit(70)
    raise SystemExit(status)
