"""Synthetic regression coverage for pre-gate rejection evidence and bounds."""
from __future__ import annotations

import hashlib
import importlib.util
import os
from pathlib import Path
import sys
import stat
import tempfile
from unittest import TestCase
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
FIXTURE_SPEC = importlib.util.spec_from_file_location("offline_proof_harmless_fixture", HERE / "harmless-fixture.py")
if FIXTURE_SPEC is None or FIXTURE_SPEC.loader is None:
    raise RuntimeError("harmless fixture module loader unavailable")
FIXTURE = importlib.util.module_from_spec(FIXTURE_SPEC)
sys.modules[FIXTURE_SPEC.name] = FIXTURE
FIXTURE_SPEC.loader.exec_module(FIXTURE)



SPEC = importlib.util.spec_from_file_location("offline_proof_guest_rejection", HERE / "guest-supervisor.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("guest supervisor module loader unavailable")
GUEST = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = GUEST
SPEC.loader.exec_module(GUEST)


class FakeChild:
    pid = 321
    stdin = None

    def __init__(self, stdout_fd: int, stderr_fd: int) -> None:
        self.stdout = os.fdopen(stdout_fd, "rb", buffering=0)
        self.stderr = os.fdopen(stderr_fd, "rb", buffering=0)
        self.wait_calls: list[float] = []

    def poll(self) -> None:
        return None

    def wait(self, *, timeout: float) -> None:
        self.wait_calls.append(timeout)
        raise GUEST.subprocess.TimeoutExpired("synthetic-child", timeout)


class FrameWriter:
    def __init__(self, *, fail: bool = False) -> None:
        self.frames: list[tuple[str, bytes]] = []
        self.fail = fail
        self.poisoned = False
        self.sequence = 0

    def not_started(self, reason: str) -> GUEST.SerialSendOutcome:
        status = "unknown" if self.poisoned else "partial"
        return GUEST.SerialSendOutcome(status, False, self.sequence, 0, 0, reason)

    def send(self, _run_id: str, name: str, payload: bytes, *, deadline: float) -> GUEST.SerialSendOutcome:
        del deadline
        if self.poisoned:
            return self.not_started("writer-poisoned")
        if self.fail and name != "control":
            self.poisoned = True
            return GUEST.SerialSendOutcome("partial", True, self.sequence, len(payload), min(4, len(payload)), "synthetic frame failure")
        self.frames.append((name, payload))
        outcome = GUEST.SerialSendOutcome("complete", True, self.sequence, len(payload), len(payload))
        self.sequence += 1
        return outcome


class RejectionLifecycleTests(TestCase):
    def invoke_rejection(self, root: Path, child: FakeChild, writer: FrameWriter, *, deadline: float | None = None) -> dict[str, object]:
        evidence = root / "evidence"
        evidence.mkdir(exist_ok=True)
        fds = {
            name: os.open(evidence / f"{name}.bin", os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            for name in ("stdout", "stderr")
        }
        peer, child_peer = GUEST.socket.socketpair()
        child_peer.close()
        if deadline is None:
            deadline = GUEST.time.monotonic() + 100.0
        return GUEST.reject_child_before_gate(
            child, "run", "case", "a" * 64, 1.0, deadline, fds, 77, writer,
            "synthetic rejection", False, peer, -1, 0, [],
        )

    def child_with_output(self, payload: bytes = b"payload") -> FakeChild:
        out_read, out_write = os.pipe()
        err_read, err_write = os.pipe()
        if payload:
            os.write(out_write, payload)
        os.close(out_write)
        os.close(err_write)
        return FakeChild(out_read, err_read)

    def test_readable_event_after_deadline_is_not_read_and_keeps_observed_prefix(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            child = self.child_with_output()
            class ReadableSelector:
                def __init__(self) -> None:
                    self.entries: dict[object, object] = {}
                    self.select_calls = 0
                def register(self, fileobj: object, _events: int, data: str) -> None:
                    self.entries[fileobj] = type("Key", (), {"fileobj": fileobj, "data": data})()
                def get_map(self) -> dict[object, object]:
                    return self.entries
                def select(self, _timeout: float) -> list[tuple[object, int]]:
                    self.select_calls += 1
                    first = next(iter(self.entries.values()))
                    return [(first, GUEST.selectors.EVENT_READ)]
                def unregister(self, fileobj: object) -> None:
                    self.entries.pop(fileobj, None)
                def close(self) -> None:
                    self.entries.clear()
            selector = ReadableSelector()
            writer = FrameWriter()
            clock_values = iter([99.0] * 10 + [101.0] * 20)
            real_read = GUEST.os.read
            reads = 0
            def bounded_read(fd: int, size: int) -> bytes:
                nonlocal reads
                reads += 1
                if reads > 1:
                    raise AssertionError("read after deadline")
                return real_read(fd, size)
            with patch.object(GUEST.selectors, "DefaultSelector", return_value=selector), patch.object(GUEST.time, "monotonic", side_effect=lambda: next(clock_values)), patch.object(GUEST, "terminate_cgroup") as terminate, patch.object(GUEST.os, "read", side_effect=bounded_read):
                result = self.invoke_rejection(root, child, writer, deadline=100.0)
            self.assertEqual(selector.select_calls, 2)
            self.assertEqual(reads, 1)
            self.assertEqual(result["streams"]["stdout"]["memory"]["bytes_retained"], len(b"payload"))
            self.assertEqual(child.wait_calls, [])
            self.assertFalse(result["reaped"])
            self.assertTrue(result["streams_incomplete"])
            terminate.assert_called()

    def test_partial_artifact_write_has_only_actual_named_byte_identity_and_failed_frame_is_not_delivered(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            child = self.child_with_output(b"observed-prefix")
            writer = FrameWriter(fail=True)
            real_write = GUEST.os.write
            partial_written = False
            def partial_then_error(fd: int, data: bytes | memoryview) -> int:
                nonlocal partial_written
                if not partial_written:
                    partial_written = True
                    return real_write(fd, bytes(data[:4]))
                raise OSError("synthetic partial artifact failure")
            with patch.object(GUEST.os, "write", side_effect=partial_then_error), patch.object(GUEST.os, "fsync", return_value=None), patch.object(GUEST, "terminate_cgroup"):
                result = self.invoke_rejection(root, child, writer)
            stream = result["streams"]["stdout"]
            actual = (root / "evidence" / "stdout.bin").read_bytes()
            self.assertEqual(actual, b"obse")
            self.assertEqual(stream["memory"]["bytes_retained"], len(b"observed-prefix"))
            self.assertEqual(stream["artifact"]["status"], "partial")
            self.assertEqual(stream["artifact"]["bytes_written"], len(actual))
            self.assertEqual(stream["artifact"]["sha256"], hashlib.sha256(actual).hexdigest())
            self.assertEqual(stream["frame"]["payload_status"], "partial")
    def test_sync_failure_and_frame_failure_are_independent_from_artifact_content(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            child = self.child_with_output(b"durable-bytes-unconfirmed")
            writer = FrameWriter(fail=True)
            with patch.object(GUEST.os, "fsync", side_effect=OSError("synthetic sync failure")), patch.object(GUEST, "terminate_cgroup"):
                result = self.invoke_rejection(root, child, writer)
            stream = result["streams"]["stdout"]
            actual = (root / "evidence" / "stdout.bin").read_bytes()
            self.assertEqual(stream["artifact"]["status"], "unknown")
            self.assertEqual(stream["artifact"]["bytes_written"], len(actual))
            self.assertIsNone(stream["artifact"]["sha256"])
            self.assertIsNone(stream["artifact"]["path"])
            self.assertEqual(stream["artifact"]["sync"], "failed")
            self.assertEqual(stream["frame"]["payload_status"], "partial")

    def test_truncated_receipt_binds_only_persisted_prefix(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            payload = b"exceeds-prefix"
            child = self.child_with_output(payload)
            with patch.object(GUEST, "MAX_STREAM", 4), patch.object(GUEST, "terminate_cgroup"):
                result = self.invoke_rejection(root, child, FrameWriter())
            stream = result["streams"]["stdout"]
            actual = (root / "evidence" / "stdout.bin").read_bytes()
            self.assertEqual(actual, payload[:4])
            self.assertEqual(stream["bytes_seen"], len(payload))
            self.assertEqual(stream["memory"]["bytes_retained"], 4)
            self.assertTrue(stream["truncated"])
            self.assertEqual(stream["artifact"]["bytes_written"], len(actual))
            self.assertEqual(stream["artifact"]["sha256"], hashlib.sha256(actual).hexdigest())

    def test_empty_observed_stream_remains_distinct_from_unobserved_stream(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            out_read, out_write = os.pipe()
            err_read, err_write = os.pipe()
            os.close(out_write)
            child = FakeChild(out_read, err_read)
            selector_type = GUEST.selectors.DefaultSelector

            class StdoutOnlySelector(selector_type):
                def register(self, fileobj, events, data=None):
                    if data == "stderr":
                        raise OSError("synthetic stderr registration failure")
                    return super().register(fileobj, events, data)

            try:
                deadline = GUEST.time.monotonic() + 10
                with patch.object(GUEST.selectors, "DefaultSelector", StdoutOnlySelector):
                    with patch.object(GUEST, "terminate_cgroup", return_value=(False, ["synthetic kill unavailable"])):
                        result = self.invoke_rejection(root, child, FrameWriter(), deadline=deadline)
            finally:
                os.close(err_write)
            stdout = result["streams"]["stdout"]
            stderr = result["streams"]["stderr"]
            self.assertTrue(stdout["observed"])
            self.assertEqual(stdout["memory"]["bytes_retained"], 0)
            self.assertEqual(stdout["artifact"]["status"], "complete")
            self.assertEqual(stdout["artifact"]["sha256"], hashlib.sha256(b"").hexdigest())
            self.assertEqual(stdout["artifact"]["path"], "evidence/stdout.bin")
            self.assertFalse(stderr["observed"])
            self.assertIsNone(stderr["memory"]["sha256"])
            self.assertIsNone(stderr["artifact"]["path"])
            self.assertIsNone(stderr["artifact"]["sha256"])
    def test_h2_storage_dispatch_writes_every_location_before_bounded_enospc(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            proof = root / "proof"
            proof.mkdir(mode=0o700)
            os.chown(proof, os.getuid(), os.getgid())
            output = proof / "output"
            output.mkdir(mode=0o700)
            os.chown(output, os.getuid(), os.getgid())
            os.chmod(output, 0o700)
            self.assertEqual(
                (output.lstat().st_dev, output.lstat().st_uid, output.lstat().st_gid, stat.S_IMODE(output.lstat().st_mode)),
                (proof.stat().st_dev, os.getuid(), os.getgid(), 0o700),
            )
            locations = {
                "/proof": proof,
                "/proof/scratch": proof / "scratch",
                "/proof/home": proof / "home",
                "/proof/reserved-mapping": proof / "reserved-mapping",
            }
            for path in locations.values():
                if path != proof:
                    path.mkdir(mode=0o700)
                    os.chown(path, os.getuid(), os.getgid())
            original_path = Path

            def mapped_path(value: object = ".") -> Path:
                raw = str(value)
                return locations.get(raw, original_path(value))

            written_fd_count = 0
            real_write = os.write

            def bounded_write(fd: int, data: bytes | memoryview) -> int:
                nonlocal written_fd_count
                if written_fd_count >= 4:
                    raise OSError(28, "synthetic bounded ENOSPC")
                written_fd_count += 1
                return real_write(fd, data)

            events: list[dict[str, object]] = []
            with patch.object(FIXTURE, "Path", side_effect=mapped_path), patch.object(FIXTURE.os, "write", side_effect=bounded_write), patch.object(FIXTURE, "emit", side_effect=events.append):
                result = FIXTURE.run("H2-aggregate-storage", output)

            self.assertEqual(result, 0)
            self.assertEqual(len(events), 1)
            event = events[0]
            self.assertEqual(event["status"], "fixture-storage-exhausted")
            self.assertEqual(event["terminal_error"]["errno"], 28)
            self.assertEqual(len(event["writes"]), 4)
            for record in event["writes"]:
                target = original_path(record["path"])
                self.assertGreater(record["bytes"], 0)
                self.assertEqual(target.stat().st_size, record["bytes"])
                self.assertEqual(target.read_bytes(), FIXTURE.CHUNK)
            self.assertEqual(event["path_devices"], {name: proof.stat().st_dev for name in ("output", "scratch", "home", "reserved-mapping")})
