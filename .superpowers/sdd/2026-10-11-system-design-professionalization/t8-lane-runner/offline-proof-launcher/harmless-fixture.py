#!/usr/bin/python3.13
"""Harmless guest-only resource and isolation fixtures; never invokes operator/vendor code."""
from __future__ import annotations

import argparse
import errno
import hashlib
import json
import os
import stat
from pathlib import Path
import sys
import time

CHUNK = b"HARMLESS_OFFLINE_PROOF\n" * 4096
FIXTURES = frozenset({
    "H1-positive-isolation",
    "H2-aggregate-storage",
    "H3-stdout-overflow",
    "H4-stderr-overflow",
    "H5-deadline",
    "H6-host-interruption",
    "H7-guest-transport-failure",
    "H8-one-shot-replay",
})


def emit(value: dict[str, object]) -> None:
    raw = json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True).encode("ascii") + b"\n"
    os.write(1, raw)


def write_exclusive(path: Path, data: bytes) -> None:
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
    try:
        view = memoryview(data)
        while view:
            count = os.write(fd, view)
            if count <= 0:
                raise OSError("short fixture write")
            view = view[count:]
        os.fsync(fd)
    finally:
        os.close(fd)


def read_pids_events() -> dict[str, int]:
    diagnostics = Path("/proof/cgroup-diagnostics")
    values: dict[str, int] = {}
    for row in (diagnostics / "pids.events").read_text(encoding="ascii").splitlines():
        fields = row.split()
        if len(fields) != 2 or not fields[1].isdigit() or fields[0] in values:
            raise RuntimeError("pids.events row is malformed")
        values[fields[0]] = int(fields[1])
    if set(values) != {"max"}:
        raise RuntimeError("pids.events does not expose the expected max counter")
    if (diagnostics / "pids.max").read_text(encoding="ascii").strip() != "3":
        raise RuntimeError("actual task cgroup does not enforce pids.max=3")
    return values

def actual_task_ids() -> list[int]:
    request = b"LIST_TASK_IDS"
    if os.write(4, request) != len(request):
        raise RuntimeError("live task-list adapter request was short")
    raw = os.read(4, 4097)
    if not raw or len(raw) > 4096:
        raise RuntimeError("live task-list adapter response is absent or over its fixed bound")
    try:
        response = json.loads(raw.decode("ascii", "strict"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise RuntimeError("live task-list adapter response is invalid") from exc
    tids = response.get("tids") if type(response) is dict else None
    if type(response) is not dict or set(response) != {"schema", "status", "tids"} or response.get("schema") != "offline-proof-task-list-v1" or response.get("status") != "ok" or type(tids) is not list or not 1 <= len(tids) <= 3 or any(type(tid) is not int or tid <= 0 for tid in tids) or tids != sorted(set(tids)):
        raise RuntimeError("live task-list adapter response violates its closed direct-TID schema")
    return tids


def positive(case_id: str, output_root: Path) -> int:
    if os.geteuid() == 0 or os.getegid() == 0:
        raise RuntimeError("fixture must run non-root")
    status = Path("/proc/self/status").read_text(encoding="ascii")
    capeff = next((line.split("\t", 1)[1].strip() for line in status.splitlines() if line.startswith("CapEff:")), None)
    no_new_privs = next((line.split("\t", 1)[1].strip() for line in status.splitlines() if line.startswith("NoNewPrivs:")), None)
    if capeff != "0000000000000000" or no_new_privs != "1":
        raise RuntimeError("capability/no_new_privs invariant failed")
    probe_results: dict[str, str] = {}
    try:
        Path("/opt/offline-proof/sentinel.txt").read_bytes()
    except PermissionError as exc:
        if exc.errno not in {errno.EACCES, errno.EPERM}:
            raise RuntimeError(f"sentinel denial used an unexpected errno: {exc.errno}") from exc
        probe_results["sentinel"] = f"denied:{exc.errno}"
    else:
        raise RuntimeError("protected synthetic sentinel unexpectedly readable")
    try:
        import socket
        socket.socket()
    except OSError as exc:
        if exc.errno != errno.EPERM:
            raise RuntimeError(f"socket denial used an unexpected errno: {exc.errno}") from exc
        probe_results["socket"] = f"denied:{exc.errno}"
    else:
        raise RuntimeError("socket creation unexpectedly succeeded")
    try:
        os.fork()
    except OSError as exc:
        if exc.errno != errno.EPERM:
            raise RuntimeError(f"fork denial used an unexpected errno: {exc.errno}") from exc
        probe_results["fork"] = f"denied:{exc.errno}"
    else:
        raise RuntimeError("process creation unexpectedly succeeded")
    executable = Path("/usr/bin/python3.13")
    executable_info = executable.lstat()
    if not stat.S_ISREG(executable_info.st_mode) or stat.S_ISLNK(executable_info.st_mode) or executable_info.st_uid != 0 or not executable_info.st_mode & 0o111:
        raise RuntimeError("pinned Python executable is absent or not an executable regular file")
    try:
        os.execve("/usr/bin/python3.13", ["/usr/bin/python3.13", "-I", "-S", "-c", "pass"], dict(os.environ))
    except OSError as exc:
        if exc.errno != errno.EPERM:
            raise RuntimeError(f"exec denial used an unexpected errno: {exc.errno}") from exc
        probe_results["execve"] = f"denied:{exc.errno}"
    else:
        raise RuntimeError("execve unexpectedly succeeded")
    try:
        os.kill(os.getpid(), 10)
    except OSError as exc:
        if exc.errno != errno.EPERM:
            raise RuntimeError(f"signal denial used an unexpected errno: {exc.errno}") from exc
        probe_results["signal"] = f"denied:{exc.errno}"
    else:
        raise RuntimeError("signal generation unexpectedly succeeded")
    import signal
    try:
        signal.setitimer(signal.ITIMER_REAL, 60.0)
    except OSError as exc:
        if exc.errno != errno.EPERM:
            raise
        probe_results["interval_timer"] = f"denied:{exc.errno}"
    else:
        signal.setitimer(signal.ITIMER_REAL, 0.0)
        raise RuntimeError("unapproved interval timer unexpectedly succeeded")
    import threading
    release = threading.Event()
    workers = [threading.Thread(target=release.wait, daemon=True) for _ in range(2)]
    for worker in workers:
        worker.start()
    tids = actual_task_ids()
    if len(tids) != 3 or any(worker.native_id not in tids or not worker.is_alive() for worker in workers):
        raise RuntimeError("actual kernel TID membership does not show main plus two live worker threads")
    pids_events_before = read_pids_events()
    excess = threading.Thread(target=lambda: None)
    denied_by_limit = False
    try:
        excess.start()
    except RuntimeError as exc:
        denied_by_limit = True
        probe_results["third_thread"] = f"denied:{type(exc).__name__}"
    else:
        excess.join(timeout=2)
        raise RuntimeError("third concurrent thread unexpectedly exceeded pids.max=3")
    finally:
        release.set()
        for worker in workers:
            worker.join(timeout=2)
    pids_events_after = read_pids_events()
    if not denied_by_limit or pids_events_after["max"] <= pids_events_before["max"]:
        raise RuntimeError("kernel pids.events max counter did not prove rejection by pids.max")
    if any(worker.is_alive() for worker in workers):
        raise RuntimeError("permitted pthread did not complete")
    probe_results["third_thread"] = "denied:pids.max"
    task_evidence = {"tids": tids, "live_workers": [worker.native_id for worker in workers], "pids_max": 3, "pids_events_before": pids_events_before, "pids_events_after": pids_events_after}
    output_root.mkdir(mode=0o700, parents=True, exist_ok=False)
    target = output_root / "fixture-positive.json"
    result = {"case": case_id, "uid": os.getuid(), "gid": os.getgid(), "cap_eff": capeff, "no_new_privs": no_new_privs, "probe_results": probe_results, "task_evidence": task_evidence}
    raw = json.dumps(result, sort_keys=True, separators=(",", ":")).encode("utf-8") + b"\n"
    write_exclusive(target, raw)
    emit({"status": "fixture-complete", "case": case_id, "artifact": target.name, "sha256": hashlib.sha256(raw).hexdigest()})
    return 0


def storage(case_id: str, output_root: Path) -> int:
    locations = (("output", output_root), ("scratch", Path("/proof/scratch")), ("home", Path("/proof/home")), ("reserved-mapping", Path("/proof/reserved-mapping")))
    proof_info = Path("/proof").stat()
    paths = []
    devices: dict[str, int] = {}
    for label, path in locations:
        info = path.lstat()
        if not stat.S_ISDIR(info.st_mode) or stat.S_ISLNK(info.st_mode) or info.st_dev != proof_info.st_dev or (info.st_uid, info.st_gid, stat.S_IMODE(info.st_mode)) != (os.getuid(), os.getgid(), 0o700):
            raise RuntimeError(f"configured {label} path is not the exact target-owned mode-0700 proof-filesystem directory")
        paths.append(path)
        devices[label] = info.st_dev
    records: list[dict[str, object]] = []
    handles = []
    hashes = []
    written = []
    try:
        for index, (label, path) in enumerate(locations):
            target = path / f"offline-proof-{case_id}-{index}.bin"
            fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_NOFOLLOW", 0), 0o600)
            handles.append(fd)
            hashes.append(hashlib.sha256())
            written.append(0)
        exhausted: dict[str, object] | None = None
        while exhausted is None:
            for index, fd in enumerate(handles):
                try:
                    view = memoryview(CHUNK)
                    while view:
                        count = os.write(fd, view)
                        if count <= 0:
                            raise OSError(5, "short storage write")
                        hashes[index].update(view[:count])
                        written[index] += count
                        view = view[count:]
                except OSError as exc:
                    if exc.errno != 28:
                        raise
                    exhausted = {"path": str(paths[index] / f"offline-proof-{case_id}-{index}.bin"), "errno": exc.errno, "reason": exc.strerror}
                    break
        records = [{"path": str(paths[index] / f"offline-proof-{case_id}-{index}.bin"), "device": devices[label], "bytes": written[index], "sha256": hashes[index].hexdigest()} for index, (label, _path) in enumerate(locations)]
        for fd in handles:
            os.fsync(fd)
    finally:
        for fd in handles:
            os.close(fd)
    emit({"status": "fixture-storage-exhausted", "case": case_id, "writes": records, "path_devices": devices, "proof_device": proof_info.st_dev, "terminal_error": exhausted})
    return 0 if exhausted is not None else 74


def overflow(stream: int) -> int:
    target = stream
    remaining = 17 * 1024 * 1024
    while remaining:
        block = CHUNK[:min(remaining, len(CHUNK))]
        view = memoryview(block)
        while view:
            count = os.write(target, view)
            if count <= 0:
                return 74
            view = view[count:]
        remaining -= len(block)
    return 0


def run(case_id: str, output_root: Path) -> int:
    if case_id == "H1-positive-isolation":
        return positive(case_id, output_root / "positive")
    if case_id == "H2-aggregate-storage":
        return storage(case_id, output_root)
    if case_id == "H3-stdout-overflow":
        return overflow(1)
    if case_id == "H4-stderr-overflow":
        return overflow(2)
    if case_id in {"H5-deadline", "H6-host-interruption"}:
        while True:
            time.sleep(10)
    if case_id == "H7-guest-transport-failure":
        emit({"status": "fixture-failure", "case": case_id, "reason": "declared harmless nonzero exit"})
        return 23
    if case_id == "H8-one-shot-replay":
        emit({"status": "fixture-complete", "case": case_id, "note": "host ledger enforces the one-shot claim"})
        return 0
    raise RuntimeError("fixture case is not allowlisted")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--case", required=True, choices=sorted(FIXTURES))
    parser.add_argument("--output-root", required=True, type=Path)
    args = parser.parse_args(argv)
    if not args.output_root.is_absolute():
        raise ValueError("output root must be absolute")
    return run(args.case, args.output_root)


if __name__ == "__main__":
    try:
        status = main()
    except BaseException as exc:
        if isinstance(exc, KeyboardInterrupt):
            raise
        os.write(2, (f"harmless-fixture: {type(exc).__name__}: {exc}\n").encode("utf-8", "replace")[:4096])
        raise SystemExit(70)
    raise SystemExit(status)
