"""Host-offline synthetic checks for deadline-aware serial framing."""
from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import sys
import tempfile
from unittest import TestCase
from unittest.mock import patch


HERE = Path(__file__).resolve().parent


def load_module(name: str, filename: str):
    spec = importlib.util.spec_from_file_location(name, HERE / filename)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"{filename} module loader unavailable")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


GUEST = load_module("offline_proof_send_guest", "guest-supervisor.py")
LAUNCH = load_module("offline_proof_send_launch", "launch.py")


def writer_for(fd: int):
    writer = object.__new__(GUEST.SerialWriter)
    writer.fd = fd
    writer.poller = GUEST.select.poll()
    writer.poller.register(fd, GUEST.select.POLLOUT | GUEST.select.POLLERR | GUEST.select.POLLHUP)
    writer.sequence = 0
    writer.total = 0
    writer.poisoned = False
    return writer


def drain(fd: int, length: int) -> bytes:
    parts: list[bytes] = []
    remaining = length
    while remaining:
        block = os.read(fd, remaining)
        if not block:
            break
        parts.append(block)
        remaining -= len(block)
    return b"".join(parts)


def assert_no_data(test: TestCase, fd: int) -> None:
    os.set_blocking(fd, False)
    with test.assertRaises(BlockingIOError):
        os.read(fd, 1)


class SerialSendDeadlineTests(TestCase):
    def test_complete_write_is_decoded_by_host_scanner(self) -> None:
        read_fd, write_fd = os.pipe()
        os.set_blocking(write_fd, False)
        writer = writer_for(write_fd)
        observed: list[tuple[str, bytes, dict[str, object]]] = []
        scanner = LAUNCH.SerialFrameScanner("run", lambda channel, payload, header: observed.append((channel, payload, header)))
        try:
            outcome = writer.send("run", "stdout", b"host-visible", deadline=GUEST.time.monotonic() + 1.0)
            wire = drain(read_fd, outcome.frame_bytes)
            scanner.feed(wire)
            scanner.finish()
        finally:
            os.close(read_fd)
            os.close(write_fd)
        self.assertEqual(outcome.status, "complete")
        self.assertEqual(outcome.bytes_written, outcome.frame_bytes)
        self.assertEqual(writer.sequence, 1)
        self.assertEqual([(channel, payload) for channel, payload, _ in observed], [("stdout", b"host-visible")])

    def test_expired_terminal_call_does_not_write_or_advance_sequence(self) -> None:
        read_fd, write_fd = os.pipe()
        os.set_blocking(write_fd, False)
        writer = writer_for(write_fd)
        writes = 0
        real_write = GUEST.os.write

        def count_write(fd: int, data: bytes | memoryview) -> int:
            nonlocal writes
            writes += 1
            return real_write(fd, data)

        try:
            with patch.object(GUEST.os, "write", side_effect=count_write):
                outcome = GUEST.send_json(writer, "run", "control", {"status": "terminal"}, deadline=GUEST.time.monotonic() - 1.0)
            self.assertEqual(outcome.status, "partial")
            self.assertFalse(outcome.started)
            self.assertEqual(outcome.bytes_written, 0)
            self.assertEqual(writes, 0)
            self.assertEqual(writer.sequence, 0)
            assert_no_data(self, read_fd)
        finally:
            os.close(read_fd)
            os.close(write_fd)

    def test_partial_frame_poisons_writer_and_host_retains_prior_frame(self) -> None:
        read_fd, write_fd = os.pipe()
        os.set_blocking(write_fd, False)
        writer = writer_for(write_fd)
        observed: list[tuple[str, bytes, dict[str, object]]] = []
        scanner = LAUNCH.SerialFrameScanner("run", lambda channel, payload, header: observed.append((channel, payload, header)))
        try:
            first = writer.send("run", "stdout", b"accepted-prefix", deadline=GUEST.time.monotonic() + 1.0)
            scanner.feed(drain(read_fd, first.frame_bytes))
            self.assertEqual(len(observed), 1)

            filler = b"x" * 4096
            filled = 0
            blocked = False
            while filled < 64 * 1024 * 1024:
                try:
                    filled += os.write(write_fd, filler)
                except BlockingIOError:
                    blocked = True
                    break
            self.assertGreater(filled, 0)
            self.assertTrue(blocked)
            self.assertEqual(len(os.read(read_fd, 5)), 5)

            real_write = GUEST.os.write
            first_write = True

            def partial_then_backpressure(fd: int, data: bytes | memoryview) -> int:
                nonlocal first_write
                if first_write:
                    first_write = False
                    return real_write(fd, bytes(data[:5]))
                raise BlockingIOError("synthetic serial backpressure")

            class BlockedPoller:
                def __init__(self) -> None:
                    self.timeouts: list[int] = []

                def poll(self, timeout_ms: int) -> list[tuple[int, int]]:
                    self.timeouts.append(timeout_ms)
                    return []

            blocked_poller = BlockedPoller()
            writer.poller = blocked_poller
            payload = b"second-frame-payload"
            with patch.object(GUEST.os, "write", side_effect=partial_then_backpressure), patch.object(GUEST.time, "monotonic", side_effect=(10.0, 10.0, 10.0, 10.0, 11.0)):
                partial = writer.send("run", "stderr", payload, deadline=11.0)
            self.assertEqual(blocked_poller.timeouts, [1000])
            self.assertEqual(partial.status, "partial")
            self.assertTrue(partial.started)
            self.assertEqual(partial.bytes_written, 5)
            self.assertEqual(partial.sequence, 1)
            self.assertTrue(writer.poisoned)
            remaining_wire = drain(read_fd, filled)
            self.assertEqual(remaining_wire[-5:], GUEST.frame_bytes("run", 1, "stderr", payload)[:5])
            scanner.feed(remaining_wire[-5:])
            with self.assertRaises(LAUNCH.FrameError):
                scanner.finish()
            self.assertEqual(len(observed), 1)
            self.assertEqual(observed[0][1], b"accepted-prefix")

            before = writer.sequence
            rejected = writer.send("run", "control", b"must-not-append", deadline=GUEST.time.monotonic() + 1.0)
            self.assertEqual(rejected.status, "unknown")
            self.assertFalse(rejected.started)
            self.assertEqual(writer.sequence, before)
            assert_no_data(self, read_fd)
        finally:
            os.close(read_fd)
            os.close(write_fd)

    def test_expired_rejection_skips_final_transport(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            out_read, out_write = os.pipe()
            err_read, err_write = os.pipe()
            os.close(out_write)
            os.close(err_write)
            evidence_dir = Path(temporary) / "evidence"
            evidence_dir.mkdir()
            stream_fds = {
                name: os.open(evidence_dir / f"{name}.bin", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                for name in ("stdout", "stderr")
            }
            serial_read, serial_write = os.pipe()
            os.set_blocking(serial_write, False)
            writer = writer_for(serial_write)
            peer, child_peer = GUEST.socket.socketpair()
            child_peer.close()

            class Child:
                pid = 321
                stdin = None
                stdout = os.fdopen(out_read, "rb", buffering=0)
                stderr = os.fdopen(err_read, "rb", buffering=0)

                @staticmethod
                def poll() -> None:
                    return None

                @staticmethod
                def wait(*, timeout: float) -> None:
                    raise AssertionError("expired caller must not wait")

            try:
                with patch.object(GUEST, "terminate_cgroup"):
                    result = GUEST.reject_child_before_gate(
                        Child(), "run", "case", "a" * 64, 1.0, GUEST.time.monotonic() - 1.0,
                        stream_fds, 77, writer, "expired", False, peer, -1, 0, [],
                    )
                self.assertEqual(result["terminal_delivery"]["status"], "partial")
                self.assertFalse(result["terminal_delivery"]["started"])
                self.assertEqual(writer.sequence, 0)
                assert_no_data(self, serial_read)
            finally:
                peer.close()
                os.close(serial_read)
                os.close(serial_write)
                for fd in stream_fds.values():
                    try:
                        os.close(fd)
                    except OSError:
                        pass
