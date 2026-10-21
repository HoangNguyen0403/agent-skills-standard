"""Non-authorizing synthetic checks for the external target-view map contract."""
from __future__ import annotations

import importlib.util
import json
import os
from contextlib import ExitStack
import sys
from pathlib import Path
import tempfile
from unittest.mock import patch
import stat
import unittest


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("offline_proof_launch", HERE / "launch.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("launcher module loader unavailable")
LAUNCH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(LAUNCH)
GUEST_SPEC = importlib.util.spec_from_file_location("offline_proof_guest", HERE / "guest-supervisor.py")
if GUEST_SPEC is None or GUEST_SPEC.loader is None:
    raise RuntimeError("guest supervisor module loader unavailable")
GUEST = importlib.util.module_from_spec(GUEST_SPEC)
sys.modules[GUEST_SPEC.name] = GUEST
GUEST_SPEC.loader.exec_module(GUEST)
PREP_SPEC = importlib.util.spec_from_file_location("offline_proof_prepare", HERE / "prepare-manifest.py")
if PREP_SPEC is None or PREP_SPEC.loader is None:
    raise RuntimeError("manifest preparer module loader unavailable")
PREP = importlib.util.module_from_spec(PREP_SPEC)
PREP_SPEC.loader.exec_module(PREP)
FIXTURE_SPEC = importlib.util.spec_from_file_location("offline_proof_fixture", HERE / "harmless-fixture.py")
if FIXTURE_SPEC is None or FIXTURE_SPEC.loader is None:
    raise RuntimeError("harmless fixture module loader unavailable")
FIXTURE = importlib.util.module_from_spec(FIXTURE_SPEC)
FIXTURE_SPEC.loader.exec_module(FIXTURE)



CONTEXT = {
    "approved_plan_sha256": "a" * 64,
    "source_map_sha256": "b" * 64,
    "prepared_manifest_sha256": "c" * 64,
    "prepared_runtime_identity_sha256": "d" * 64,
    "prepared_runtime_image_sha256": "e" * 64,
    "preparation_claim_sha256": "f" * 64,
}


def directory(path: str, mode: int = 0o555, uid: int = 0, gid: int = 0) -> dict[str, object]:
    return {"path": path, "kind": "directory", "mode": mode, "uid": uid, "gid": gid}


def synthetic_document() -> dict[str, object]:
    entries: list[dict[str, object]] = [
        {"path": "/bin", "kind": "symlink", "target": "/usr/bin"},
        directory("/etc") | {"source_mode": 0o755, "source_uid": 0, "source_gid": 0},
        {"path": "/etc/fixture", "kind": "regular", "bytes": 4, "sha256": LAUNCH.sha256(b"data"), "mode": 0o644, "uid": 0, "gid": 0},
        directory("/usr") | {"source_mode": 0o755, "source_uid": 0, "source_gid": 0},
        directory("/usr/bin") | {"source_mode": 0o755, "source_uid": 0, "source_gid": 0},
        {"path": "/usr/bin/python3.13", "kind": "regular", "bytes": 6, "sha256": LAUNCH.sha256(b"python"), "mode": 0o755, "uid": 0, "gid": 0},
    ]
    for path, kind in LAUNCH.TARGET_VIEW_FIXED_KINDS.items():
        if kind == "directory":
            if path == "/":
                entries.append(directory(path, 0o555) | {"source_mode": 0o755, "source_uid": 0, "source_gid": 0})
            elif path == "/proof" or path == "/proof/out":
                entries.append(directory(path, 0o555))
            elif path in LAUNCH.TARGET_VIEW_WRITABLE_DIRS:
                entries.append(directory(path, 0o700, 65532, 65532))
            else:
                entries.append(directory(path, 0o555))
        else:
            operation, maximum_bytes = LAUNCH.TARGET_VIEW_DYNAMIC[path]
            entries.append({"path": path, "kind": "dynamic", "operation": operation, "maximum_bytes": maximum_bytes})
    entries.sort(key=lambda row: row["path"])
    return {
        "schema": "offline-proof-target-view-v1",
        "phase": "fixture",
        "context": CONTEXT,
        "entries": entries,
        "descriptors": ["stdin", "stdout", "stderr"],
        "interfaces": LAUNCH.TARGET_VIEW_INTERFACES,
    }


def raw_document(document: dict[str, object]) -> bytes:
    return json.dumps(document, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")


class TargetViewPolicyTests(unittest.TestCase):
    def validate(self, document: dict[str, object], expected: str | None = None) -> dict[str, object]:
        raw = raw_document(document)
        return LAUNCH.validate_target_view(raw, expected_raw_sha256=expected or LAUNCH.sha256(raw), prepared_runtime_context=CONTEXT)

    def test_host_and_guest_accept_same_complete_synthetic_map(self) -> None:
        raw = raw_document(synthetic_document())
        expected = LAUNCH.sha256(raw)
        host_value = LAUNCH.validate_target_view(raw, expected_raw_sha256=expected, prepared_runtime_context=CONTEXT)
        guest_value = GUEST.parse_target_view(raw, expected_sha256=expected, context=CONTEXT)
        self.assertEqual(host_value, guest_value)
    def test_target_view_declares_only_the_narrow_fd_interfaces(self) -> None:
        self.assertNotIn("/proc/self/task", LAUNCH.TARGET_VIEW_DYNAMIC)
        self.assertEqual(LAUNCH.TARGET_VIEW_INTERFACES[0]["fd"], 4)
        self.assertEqual(LAUNCH.TARGET_VIEW_INTERFACES[0]["request"], "LIST_TASK_IDS")
        self.assertEqual(LAUNCH.TARGET_VIEW_INTERFACES[1]["fd"], 3)
        self.assertEqual(LAUNCH.TARGET_VIEW_INTERFACES[1]["path"], "/proc/self/fd/3")
        document = synthetic_document()
        document["interfaces"] = [dict(row) for row in LAUNCH.TARGET_VIEW_INTERFACES]
        document["interfaces"][0]["maximum_tids"] = 1000000
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)
        document = synthetic_document()
        document["entries"].append({"path": "/proc/self/task", "kind": "dynamic", "operation": "proc-task-list", "maximum_bytes": 4096})
        document["entries"].sort(key=lambda row: row["path"])
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)

    class FakeTaskPeer:
        def __init__(self, *requests: bytes) -> None:
            self.requests = list(requests)
            self.receive_bounds: list[int] = []
            self.responses: list[bytes] = []
        def recv(self, maximum: int) -> bytes:
            self.receive_bounds.append(maximum)
            request = self.requests.pop(0)
            return request[:maximum]
        def send(self, response: bytes) -> int:
            self.responses.append(response)
            return len(response)

    def test_task_adapter_returns_only_bounded_direct_tids_for_fixed_request(self) -> None:
        peer = self.FakeTaskPeer(b"LIST_TASK_IDS")
        with patch.object(GUEST, "enumerate_owned_direct_task_ids", return_value=[101, 202]) as enumerate_tids:
            count, error, close_channel = GUEST.task_list_response(peer, 417, 0)
        response = json.loads(peer.responses[0])
        self.assertEqual(response, {"schema": "offline-proof-task-list-v1", "status": "ok", "tids": [101, 202]})
        self.assertEqual((count, error, close_channel), (1, None, False))
        self.assertEqual(peer.receive_bounds, [14])
        enumerate_tids.assert_called_once_with(417)

    def test_task_adapter_rejects_arbitrary_path_and_closes_after_bounded_reply(self) -> None:
        peer = self.FakeTaskPeer(b"/proc/1/task")
        with patch.object(GUEST, "enumerate_owned_direct_task_ids") as enumerate_tids:
            count, error, close_channel = GUEST.task_list_response(peer, 417, 0)
        self.assertEqual(json.loads(peer.responses[0]), {"schema": "offline-proof-task-list-v1", "status": "unavailable", "tids": []})
        self.assertEqual((count, close_channel), (1, True))
        self.assertIsNotNone(error)
        enumerate_tids.assert_not_called()

    def test_task_adapter_closes_after_sixteenth_following_request(self) -> None:
        peer = self.FakeTaskPeer(b"LIST_TASK_IDS", b"LIST_TASK_IDS")
        with patch.object(GUEST, "enumerate_owned_direct_task_ids", return_value=[101]):
            count, error, close_channel = GUEST.task_list_response(peer, 417, 15)
            self.assertEqual((count, error, close_channel), (16, None, False))
            count, error, close_channel = GUEST.task_list_response(peer, 417, count)
        self.assertEqual(json.loads(peer.responses[1])["status"], "unavailable")
        self.assertEqual((count, close_channel), (17, True))
        self.assertIsNotNone(error)

    def test_root_is_required_and_typed(self) -> None:
        document = synthetic_document()
        document["entries"] = [row for row in document["entries"] if row["path"] != "/"]
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)
        document = synthetic_document()
        root = next(row for row in document["entries"] if row["path"] == "/")
        root.clear()
        root.update({"path": "/", "kind": "symlink", "target": "/etc"})
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)
    def test_fixture_task_client_accepts_only_closed_sorted_live_id_response(self) -> None:
        response = json.dumps({"schema": "offline-proof-task-list-v1", "status": "ok", "tids": [101, 202]}, separators=(",", ":")).encode("ascii")
        with patch.object(FIXTURE.os, "write", return_value=len(b"LIST_TASK_IDS")) as write, patch.object(FIXTURE.os, "read", return_value=response) as read:
            self.assertEqual(FIXTURE.actual_task_ids(), [101, 202])
        write.assert_called_once_with(4, b"LIST_TASK_IDS")
        read.assert_called_once_with(4, 4097)
        for tids in ([202, 101], [101, 101], [1, 2, 3, 4]):
            bad = json.dumps({"schema": "offline-proof-task-list-v1", "status": "ok", "tids": tids}).encode("ascii")
            with patch.object(FIXTURE.os, "write", return_value=len(b"LIST_TASK_IDS")), patch.object(FIXTURE.os, "read", return_value=bad):
                with self.assertRaises(RuntimeError):
                    FIXTURE.actual_task_ids()

    def test_generated_root_policy_is_separate_from_observed_source_identity(self) -> None:
        document = synthetic_document()
        root = next(row for row in document["entries"] if row["path"] == "/")
        self.assertEqual((root["mode"], root["source_mode"]), (0o555, 0o755))
        raw = raw_document(document)
        self.assertEqual(
            LAUNCH.validate_target_view(raw, expected_raw_sha256=LAUNCH.sha256(raw), prepared_runtime_context=CONTEXT),
            GUEST.parse_target_view(raw, expected_sha256=LAUNCH.sha256(raw), context=CONTEXT),
        )

    def test_root_source_observation_is_checked_separately_from_generated_mode(self) -> None:
        with tempfile.TemporaryDirectory() as directory_path:
            os.chmod(directory_path, 0o755)
            info = os.stat(directory_path)
            row = {"path": "/", "mode": 0o555, "source_mode": stat.S_IMODE(info.st_mode), "source_uid": info.st_uid, "source_gid": info.st_gid}
            fd = os.open(directory_path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            with patch.object(GUEST, "_open_runtime_parent", return_value=(fd, None)):
                GUEST._verify_view_source_directory(row)
            row["source_mode"] = 0o700
            fd = os.open(directory_path, os.O_RDONLY | getattr(os, "O_DIRECTORY", 0))
            with patch.object(GUEST, "_open_runtime_parent", return_value=(fd, None)):
                with self.assertRaises(GUEST.GuestError):
                    GUEST._verify_view_source_directory(row)

    def test_guest_rejects_unpinned_map_and_wrong_prepared_context(self) -> None:
        raw = raw_document(synthetic_document())
        expected = LAUNCH.sha256(raw)
        with self.assertRaises(GUEST.GuestError):
            GUEST.parse_target_view(raw, expected_sha256="0" * 64, context=CONTEXT)
        wrong_context = {**CONTEXT, "source_map_sha256": "9" * 64}
        with self.assertRaises(GUEST.GuestError):
            GUEST.parse_target_view(raw, expected_sha256=expected, context=wrong_context)

    def test_expired_deadline_signals_only_owned_positive_pid(self) -> None:
        class FakeProcess:
            pid = 417
            returncode: int | None = None

            def poll(self) -> int | None:
                return self.returncode

        process = FakeProcess()
        observed: list[tuple[int, int]] = []

        def signal_owned(pid: int, signum: int) -> None:
            observed.append((pid, signum))
            if pid == process.pid and signum == LAUNCH.signal.SIGKILL:
                process.returncode = 0

        with patch.object(LAUNCH.os, "kill", side_effect=signal_owned):
            result = LAUNCH.stop_vm(Path("/not-opened"), process, hard=True, deadline=0.0)

        self.assertEqual(observed, [(process.pid, LAUNCH.signal.SIGKILL)])
        self.assertTrue(result["reaped"])
        self.assertFalse(result["rest_attempted"])
        self.assertNotIn("signal_error", result)

    def test_candidate_rehash_does_not_replace_independent_expected_pin(self) -> None:
        original = raw_document(synthetic_document())
        changed = synthetic_document()
        changed["entries"].append(directory("/dev"))
        changed["entries"].sort(key=lambda row: row["path"])
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(changed, LAUNCH.sha256(original))

    def test_forbidden_device_path_rejected_even_when_map_is_self_consistent(self) -> None:
        document = synthetic_document()
        document["entries"].append({"path": "/dev/null", "kind": "regular", "bytes": 0, "sha256": LAUNCH.sha256(b""), "mode": 0o666, "uid": 0, "gid": 0})
        document["entries"].sort(key=lambda row: row["path"])
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)

    def test_output_parent_cannot_be_target_writable(self) -> None:
        document = synthetic_document()
        row = next(row for row in document["entries"] if row["path"] == "/proof/out")
        row.update({"mode": 0o700, "uid": 65532, "gid": 65532})
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)

    def test_missing_required_fixed_alias_rejected(self) -> None:
        document = synthetic_document()
        document["entries"] = [row for row in document["entries"] if row["path"] != "/proof/reserved-mapping"]
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)

    def test_symlink_parent_file_alias_rejected(self) -> None:
        document = synthetic_document()
        document["entries"].append({"path": "/bin/python3.13", "kind": "regular", "bytes": 5, "sha256": LAUNCH.sha256(b"python"), "mode": 0o755, "uid": 0, "gid": 0})
        document["entries"].sort(key=lambda row: row["path"])
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)

    def test_symlink_cycle_rejected(self) -> None:
        document = synthetic_document()
        document["entries"].extend([
            {"path": "/cycle-a", "kind": "symlink", "target": "/cycle-b"},
            {"path": "/cycle-b", "kind": "symlink", "target": "/cycle-a"},
        ])
        document["entries"].sort(key=lambda row: row["path"])
        with self.assertRaises(LAUNCH.LaunchError):
            self.validate(document)


class SourceMapContractTests(unittest.TestCase):
    def source_map(self) -> tuple[bytes, list[dict[str, object]]]:
        rows: list[dict[str, object]] = [
            {"path": "a/contract.md", "class": "contract", "bytes": 2, "sha256": "a" * 64},
            {"path": "b/packet.json", "class": "packet", "bytes": 3, "sha256": "b" * 64},
        ]
        document = {
            "schema": "offline-proof-source-map-v1",
            "phase": "preparation",
            "approved_plan_sha256": PREP.PLAN_SHA256,
            "files": rows,
        }
        raw = json.dumps(document, sort_keys=True, separators=(",", ":")).encode("utf-8")
        return raw, rows

    def validate(self, raw: bytes, expected: str | None = None) -> dict[str, object]:
        context = {"phase": "preparation", "approved_plan_sha256": PREP.PLAN_SHA256}
        return PREP.validate_source_map(raw, expected_raw_sha256=expected or PREP.sha256(raw), phase_context=context)

    def test_synthetic_source_map_uses_independent_raw_digest(self) -> None:
        raw, rows = self.source_map()
        value = self.validate(raw)
        self.assertEqual(value["rows"], rows)
        with self.assertRaises(ValueError):
            self.validate(raw + b" ", PREP.sha256(raw))

    def test_synthetic_source_map_requires_ordered_typed_rows(self) -> None:
        raw, _rows = self.source_map()
        document = json.loads(raw)
        document["files"].reverse()
        reversed_raw = json.dumps(document, sort_keys=True, separators=(",", ":")).encode("utf-8")
        with self.assertRaises(ValueError):
            self.validate(reversed_raw)
        document["files"].reverse()
        document["files"][0]["bytes"] = True
        boolean_size_raw = json.dumps(document, sort_keys=True, separators=(",", ":")).encode("utf-8")
        with self.assertRaises(ValueError):
            self.validate(boolean_size_raw)

    def test_staged_closure_membership_must_match_external_map(self) -> None:
        raw, rows = self.source_map()
        value = self.validate(raw)
        PREP._check_source_map_rows(value, rows)
        with self.assertRaises(ValueError):
            PREP._check_source_map_rows(value, rows[:-1])

    def test_derived_read_rejects_unapproved_path_before_open(self) -> None:
        with patch.object(PREP, "record", side_effect=AssertionError("unapproved file opened")) as read:
            with self.assertRaises(ValueError):
                PREP.record_approved_source(PREP.REPO, "unapproved/packet.json", "packet", {})
            read.assert_not_called()

    def test_derived_read_compares_bytes_to_external_row_before_return(self) -> None:
        relative = "approved/packet.json"
        expected = {"path": relative, "class": "packet", "bytes": 1, "sha256": "a" * 64}
        with patch.object(PREP, "record", return_value=({"path": relative, "class": "packet", "bytes": 1, "sha256": "b" * 64}, b"x")):
            with self.assertRaisesRegex(ValueError, "independently approved identity"):
                PREP.record_approved_source(PREP.REPO, relative, "packet", {relative: expected})



class ChildCleanupTests(unittest.TestCase):
    def exercise_pre_gate_failure(self, *, member: bool, output: bytes = b"captured-before-gate") -> dict[str, object]:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            library_path = root / "synthetic-libseccomp"
            library_path.write_bytes(b"synthetic authenticated descriptor")
            base_library_fd = os.open(library_path, os.O_RDONLY)
            handed_fds: list[int] = []
            proof_root = root / "proof"
            (proof_root / "evidence").mkdir(parents=True)
            group = root / "cgroup"
            group.mkdir()
            (group / "cgroup.procs").write_text("123\n" if member else "999\n", encoding="ascii")
            (group / "pids.current").write_text("1\n", encoding="ascii")
            output_read, output_write = os.pipe()
            error_read, error_write = os.pipe()
            if output:
                os.write(output_write, output)
            os.close(output_write)
            os.close(error_write)
            stdin = None
            if member:
                stdin_read, stdin_write = os.pipe()
                os.close(stdin_read)
                stdin = os.fdopen(stdin_write, "wb", buffering=0)
            class FakeChild:
                pid = 123
                stdout = os.fdopen(output_read, "rb", buffering=0)
                stderr = os.fdopen(error_read, "rb", buffering=0)
                def __init__(self) -> None:
                    self.stdin = stdin
                def poll(self) -> None:
                    return None
                def wait(self, *, timeout: float) -> None:
                    self_outer.assertLessEqual(timeout, 0.5)
                    raise GUEST.subprocess.TimeoutExpired("synthetic-child", timeout)
            self_outer = self
            child = FakeChild()
            stream_paths = {name: proof_root / "evidence" / f"{name}.bin" for name in ("stdout", "stderr")}
            stream_fds = {
                name: os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
                for name, path in stream_paths.items()
            }
            frame_send = unittest.mock.Mock()

            class FakeWriter:
                poisoned = False
                sequence = 0

                @staticmethod
                def not_started(reason: str) -> GUEST.SerialSendOutcome:
                    return GUEST.SerialSendOutcome("partial", False, 0, 0, 0, reason)

                def send(self, _run_id: str, channel: str, payload: bytes, *, deadline: float) -> GUEST.SerialSendOutcome:
                    del deadline
                    frame_send(_run_id, channel, payload)
                    outcome = GUEST.SerialSendOutcome("complete", True, self.sequence, len(payload), len(payload))
                    self.sequence += 1
                    return outcome

                def send_corrupt(self, run_id: str, channel: str, payload: bytes, *, deadline: float) -> GUEST.SerialSendOutcome:
                    return self.send(run_id, channel, payload, deadline=deadline)

            writer = FakeWriter()
            def duplicate_library_fd(_identity: object, _target_view: object) -> int:
                fd = os.dup(base_library_fd)
                handed_fds.append(fd)
                return fd
            with patch.object(GUEST.socket, "SOCK_SEQPACKET", GUEST.socket.SOCK_STREAM), patch.object(GUEST, "prepare_run_output"), patch.object(GUEST, "reserve_stream_files", return_value=stream_fds), patch.object(GUEST, "open_verified_libseccomp_fd", side_effect=duplicate_library_fd), patch.object(GUEST.subprocess, "Popen", return_value=child), patch.object(GUEST, "terminate_cgroup") as terminate, patch.object(GUEST, "install_target_view_dynamic") as install, patch.object(GUEST, "verify_target_view_mounts") as verify:
                result = GUEST.collect_child("run", "case", "a" * 64, "b" * 64, 500, {"libseccomp_path": "/usr/lib/libseccomp.so.2"}, proof_root, root / "view", {}, group, 77, 88, writer)
            os.close(base_library_fd)
            with self.assertRaises(OSError):
                os.fstat(handed_fds[0])
            self.assertEqual(stream_paths["stdout"].read_bytes(), output)
            self.assertEqual(result["streams"]["stdout"]["bytes_seen"], len(output))
            self.assertEqual(result["task_listing"], {"requests": 0, "errors": []})
            self.assertTrue(result["streams"]["stdout"]["observed"])
            self.assertTrue(result["streams"]["stderr"]["observed"])
            self.assertFalse(result["reaped"])
            self.assertTrue(result["cgroup_killed"])
            self.assertEqual(result["cgroup"]["observed_member"], member)
            terminate.assert_called()
            self.assertEqual(install.called, member)
            self.assertEqual(verify.called, member)
            if output:
                self.assertTrue(any(call.args[1] == "stdout" and call.args[2] == output for call in frame_send.call_args_list))
            return result

    def test_pre_gate_membership_failure_preserves_observed_streams_and_bounded_reap(self) -> None:
        result = self.exercise_pre_gate_failure(member=False)
        self.assertEqual(result["status"], "rejected")

    def test_gate_write_failure_preserves_observed_streams_and_bounded_reap(self) -> None:
        result = self.exercise_pre_gate_failure(member=True)
        self.assertEqual(result["status"], "rejected")
    def test_pre_gate_failure_records_observed_empty_streams(self) -> None:
        result = self.exercise_pre_gate_failure(member=False, output=b"")
        for stream in result["streams"].values():
            self.assertTrue(stream["observed"])
            self.assertEqual(stream["bytes_seen"], 0)
            self.assertEqual(stream["memory"]["bytes_retained"], 0)
            self.assertEqual(stream["memory"]["sha256"], GUEST.sha256(b""))


class ControllerFlowTests(unittest.TestCase):
    def run_controller(self, *, expires_at: int) -> tuple[dict[str, object], object, object]:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            storage = root / "storage"
            (storage / "bin").mkdir(parents=True)
            (storage / "ledger").mkdir()
            vfkit = storage / "bin" / "vfkit"
            vfkit.write_bytes(b"synthetic")
            vfkit.chmod(0o500)
            run_id = "12345678-1234-4234-8234-123456789abc"
            run = root / run_id
            manifest_path = root / "manifest.json"
            manifest_path.write_bytes(b"synthetic")
            release_path = storage / "ledger" / "controller-release.json"
            static_review = root / "static-review.md"
            static_review.write_bytes(b"synthetic independent review")
            static_review.chmod(0o400)
            manifest = {"approved_plan_sha256": "a" * 64, "manifest_sha256": "b" * 64}
            release = {
                "schema": "offline-proof-controller-release-v1",
                "status": "APPROVED",
                "approved_plan_sha256": "a" * 64,
                "manifest_sha256": "b" * 64,
                "source_map_sha256": "c" * 64,
                "target_view_sha256": "e" * 64,
                "static_review_sha256": LAUNCH.sha256(static_review.read_bytes()),
                "launcher_sha256": "d" * 64,
                "issued_at": 90,
                "expires_at": expires_at,
                "authorized_preparation_starts": 1,
                "authorized_fixture_ids": ["H1-positive-isolation"],
                "authorized_inspection_ids": [],
                "operator_execution": "DENY",
                "release_nonce": "synthetic-nonce",
            }
            release_raw = LAUNCH.canonical(release) + b"\n"
            release_path.write_bytes(release_raw)
            release_path.chmod(0o600)
            release_digest = LAUNCH.sha256(release_raw)
            class FakeProcess:
                pid = 321
                returncode: int | None = None
                def __init__(self) -> None:
                    out_read, out_write = os.pipe()
                    err_read, err_write = os.pipe()
                    os.close(out_write)
                    os.close(err_write)
                    self.stdout = os.fdopen(out_read, "rb", buffering=0)
                    self.stderr = os.fdopen(err_read, "rb", buffering=0)
                def poll(self) -> int | None:
                    return self.returncode
            process = FakeProcess()
            claim = unittest.mock.Mock()
            spawned = unittest.mock.Mock(return_value=process)
            def rest_request(_socket: Path, _method: str, endpoint: str, _body: bytes | None = None, **_kwargs: object) -> tuple[int, bytes]:
                if endpoint == "/vm/state":
                    return 200, b'{"state":"running"}'
                if endpoint == "/vm/inspect":
                    process.returncode = 0
                    return 200, b'{"cpus":2,"memory":4096}'
                raise AssertionError(endpoint)
            def create_run(_run_id: str) -> Path:
                (run / "evidence").mkdir(parents=True)
                (run / "host").mkdir()
                return run
            def build_args(_kind: str, _run: Path, _run_id: str, _case_id: str, _manifest: object, _manifest_path: Path, _closure_root: Path, _duration: int, *_args: object) -> tuple[list[str], dict[str, object]]:
                return [str(vfkit)], {"socket": run / "host/vfkit.sock", "writable_image": None}
            with ExitStack() as stack:
                stack.enter_context(patch.object(LAUNCH.sys.stdin, "isatty", return_value=True))
                stack.enter_context(patch.object(LAUNCH, "STORAGE", storage))
                stack.enter_context(patch.object(LAUNCH, "STATIC_REVIEW", static_review))
                stack.enter_context(patch.object(LAUNCH.time, "time", side_effect=[100, 104, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119]))
                stack.enter_context(patch.object(LAUNCH, "check_storage"))
                stack.enter_context(patch.object(LAUNCH, "load_lock", return_value={"assets": {"vfkit": {"max_download_bytes": 64, "sha256": "f" * 64}}}))
                stack.enter_context(patch.object(LAUNCH, "verify_project_pins"))
                stack.enter_context(patch.object(LAUNCH, "verify_preflight", return_value="1" * 64))
                stack.enter_context(patch.object(LAUNCH, "verify_manifest_storage_path"))
                stack.enter_context(patch.object(LAUNCH, "verify_manifest", return_value=manifest))
                stack.enter_context(patch.object(LAUNCH, "fixture_capacity_reservation", return_value=0))
                stack.enter_context(patch.object(LAUNCH, "reserve_campaign_capacity"))
                stack.enter_context(patch.object(LAUNCH, "current_launcher_digest", return_value=release["launcher_sha256"]))
                stack.enter_context(patch.object(LAUNCH, "create_run_dir", side_effect=create_run))
                stack.enter_context(patch.object(LAUNCH, "build_vm_args", side_effect=build_args))
                stack.enter_context(patch.object(LAUNCH, "hash_regular", return_value=("f" * 64, 9)))
                stack.enter_context(patch.object(LAUNCH, "claim_start", claim))
                stack.enter_context(patch.object(LAUNCH.subprocess, "Popen", spawned))
                stack.enter_context(patch.object(LAUNCH, "wait_socket"))
                stack.enter_context(patch.object(LAUNCH, "rest_request", side_effect=rest_request))
                stack.enter_context(patch.object(LAUNCH.signal, "signal", side_effect=lambda *_args: None))
                stack.enter_context(patch.object(LAUNCH, "print"))
                result = LAUNCH._run_vm_locked("fixture", "H1-positive-isolation", run_id, manifest_path, release_path, release_digest, f"START ONE FIXTURE VM {run_id} WITH OPERATOR EXECUTION DENIED")
            process.stdout.close()
            process.stderr.close()
            return result, claim, spawned

    def test_ready_rest_loop_initializes_first_poll_and_checks_state(self) -> None:
        result, claim, spawned = self.run_controller(expires_at=200)
        self.assertEqual(result["state_observations"][0]["state"], {"state": "running"})
        self.assertEqual(result["result"], "failure")
        self.assertNotIn("host_exception", result)
        self.assertEqual(spawned.call_count, 1)
        self.assertEqual(claim.call_count, 1)

    def test_release_is_revalidated_after_blocking_start_preparation(self) -> None:
        result, claim, spawned = self.run_controller(expires_at=105)
        self.assertIn("controller release is not currently valid", result["host_exception"]["reason"])
        self.assertEqual(claim.call_count, 0)
        self.assertEqual(spawned.call_count, 0)


class LauncherBoundaryRegressionTests(unittest.TestCase):
    def test_fixture_input_and_guest_consumer_use_prepared_root_extent(self) -> None:
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary).resolve()
            storage = root / "storage"
            (storage / "ledger").mkdir(parents=True)
            run = root / "run"
            (run / "host").mkdir(parents=True)
            runtime = root / "prepared-disk.img"
            start_sector = 8192
            root_bytes = 4 * 1024 * 1024
            disk = bytearray(b"D" * (start_sector * 512))
            disk.extend(b"R" * root_bytes)
            disk.extend(b"T" * (2 * 1024 * 1024))
            entries = bytearray(128 * 128)
            entries[:16] = LAUNCH.uuid.UUID("0fc63daf-8483-4772-8e79-3d69d8477de4").bytes_le
            entries[16:32] = LAUNCH.uuid.UUID("12345678-1234-4234-8234-123456789abc").bytes_le
            LAUNCH.struct.pack_into("<QQQ", entries, 32, start_sector, start_sector + root_bytes // 512 - 1, 0)
            disk_sectors = len(disk) // 512
            header = bytearray(512)
            LAUNCH.struct.pack_into(
                "<8sIIIIQQQQ16sQIII", header, 0, b"EFI PART", 0x00010000,
                92, 0, 0, 1, disk_sectors - 1, 34, disk_sectors - 34,
                LAUNCH.uuid.UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa").bytes_le,
                2, 128, 128, LAUNCH.zlib.crc32(entries) & 0xffffffff,
            )
            LAUNCH.struct.pack_into("<I", header, 16, LAUNCH.zlib.crc32(header[:92]) & 0xffffffff)
            disk[512:1024] = header
            disk[1024:1024 + len(entries)] = entries
            runtime.write_bytes(disk)
            root_payload = bytes(disk[start_sector * 512:start_sector * 512 + root_bytes])
            descriptor = {
                "runtime_image_bytes": len(disk),
                "runtime_image_sha256": LAUNCH.sha256(bytes(disk)),
                "root_partition_start_sector": start_sector,
                "root_partition_sectors": root_bytes // 512,
                "root_partition_sha256": LAUNCH.sha256(root_payload),
                "runtime_identity_sha256": CONTEXT["prepared_runtime_identity_sha256"],
                "rootfs_uuid": "12345678-1234-4234-8234-123456789abc",
                "root_partition_device": "vda1",
                "preparation_claim_sha256": CONTEXT["preparation_claim_sha256"],
            }
            manifest = {
                "approved_plan_sha256": CONTEXT["approved_plan_sha256"],
                "source_map": {"raw_sha256": CONTEXT["source_map_sha256"]},
                "manifest_sha256": CONTEXT["prepared_manifest_sha256"],
            }
            target_view = synthetic_document()
            target_view["context"] = {**CONTEXT, "prepared_runtime_image_sha256": descriptor["runtime_image_sha256"]}
            raw_map = raw_document(target_view)
            (storage / "ledger" / "target-view.json").write_bytes(raw_map)
            fake_kernel = root / "kernel"
            fake_initrd = root / "initrd"
            real_ftruncate = os.ftruncate

            def bounded_ftruncate(fd: int, length: int) -> None:
                if length != 4 * 1024 * 1024 * 1024:
                    real_ftruncate(fd, length)

            with patch.object(LAUNCH, "STORAGE", storage), patch.object(
                LAUNCH, "load_runtime_artifacts", return_value=(descriptor, runtime, fake_kernel, fake_initrd)
            ), patch.object(LAUNCH.os, "ftruncate", side_effect=bounded_ftruncate):
                args, spec = LAUNCH.build_vm_args(
                    "fixture", run, "12345678-1234-4234-8234-123456789abc",
                    "H2-aggregate-storage", manifest, root / "manifest.json",
                    root / "closure", 300_000, target_view_sha256=LAUNCH.sha256(raw_map),
                )
            image = spec["runtime_input_image"]
            runtime_start = spec["runtime_start_sector"]
            view_start = spec["target_view_start_sector"]
            built = image.read_bytes()
            partition_entry = built[1024:1152]
            self.assertEqual(int.from_bytes(partition_entry[32:40], "little"), runtime_start)
            self.assertEqual(int.from_bytes(partition_entry[40:48], "little"), runtime_start + root_bytes // 512 - 1)
            self.assertEqual(built[runtime_start * 512:runtime_start * 512 + root_bytes], root_payload)
            self.assertNotEqual(built[runtime_start * 512:runtime_start * 512 + 512], b"D" * 512)

            bootloader = next(argument for argument in args if 'cmdline="' in argument)
            command_line = bootloader.split('cmdline="', 1)[1].rsplit('"', 1)[0]
            cmdline_path = root / "cmdline"
            cmdline_path.write_text(command_line, encoding="ascii")
            root_device = root / "root-device"
            root_device.write_bytes(built[runtime_start * 512:runtime_start * 512 + root_bytes])
            view_entry = built[1152:1280]
            view_start_sector, view_end_sector = LAUNCH.struct.unpack_from("<QQ", view_entry, 32)
            view_device = root / "view-device"
            view_device.write_bytes(built[view_start_sector * 512:(view_end_sector + 1) * 512])
            root_sys = root / "sys/sda1"
            view_sys = root / "sys/sda2"
            root_sys.mkdir(parents=True)
            view_sys.mkdir(parents=True)
            (root_sys / "start").write_text("2048", encoding="ascii")
            (root_sys / "size").write_text(str(root_bytes // 512), encoding="ascii")
            (root_sys / "ro").write_text("1", encoding="ascii")
            (view_sys / "start").write_text(str(view_start), encoding="ascii")
            (view_sys / "size").write_text(str(view_end_sector - view_start_sector + 1), encoding="ascii")
            (view_sys / "ro").write_text("1", encoding="ascii")

            mapped = {
                "/proc/cmdline": cmdline_path,
                "/dev/sda1": root_device,
                "/dev/sda2": view_device,
                "/sys/class/block/sda1": root_sys,
                "/sys/class/block/sda2": view_sys,
            }
            original_path = Path
            real_open = os.open

            def mapped_path(value: object = ".") -> Path:
                return mapped.get(str(value), original_path(value))

            def mapped_open(path: object, flags: int, *mode: int) -> int:
                return real_open(mapped.get(str(path), path), flags, *mode)

            with patch.object(GUEST, "Path", side_effect=mapped_path), patch.object(
                GUEST.os, "open", side_effect=mapped_open
            ), patch.object(GUEST.stat, "S_ISBLK", side_effect=lambda mode: LAUNCH.stat.S_ISREG(mode)):
                params = GUEST.parse_cmdline()
                self.assertEqual(params["offlineproof.prepared_image_bytes"], str(len(disk)))
                self.assertEqual(params["offlineproof.prepared_root_partition_bytes"], str(root_bytes))
                observed = GUEST.read_target_view_device(params, manifest)
            self.assertEqual(observed["schema"], "offline-proof-target-view-v1")
            self.assertEqual(observed["context"]["prepared_runtime_image_sha256"], descriptor["runtime_image_sha256"])

    def test_fixture_capacity_reservation_covers_composite_and_evidence(self) -> None:
        cap = 64 * 1024 * 1024 * 1024
        with tempfile.TemporaryDirectory() as temporary:
            storage = Path(temporary).resolve()
            (storage / "images").mkdir()
            (storage / "ledger").mkdir()
            (storage / "images" / "runtime-descriptor.json").write_text(
                '{"root_partition_sectors":4096}', encoding="ascii"
            )
            (storage / "ledger" / "target-view.json").write_bytes(b"x" * 4096)
            with patch.object(LAUNCH, "STORAGE", storage):
                extra = LAUNCH.fixture_capacity_reservation()
            composite_bytes = LAUNCH.fixture_runtime_input_bytes(2 * 1024 * 1024, 4096)
            self.assertEqual(extra, composite_bytes + LAUNCH.FIXTURE_EVIDENCE_RESERVATION)
            required = 4 * 1024 * 1024 * 1024 + extra
            with patch.object(LAUNCH, "STORAGE", storage), patch.object(
                LAUNCH, "campaign_usage", return_value=cap - required
            ), patch.object(LAUNCH.shutil, "disk_usage", return_value=type("Usage", (), {"free": cap})()):
                LAUNCH.reserve_campaign_capacity("fixture", additional_needed=extra)
            with patch.object(LAUNCH, "STORAGE", storage), patch.object(
                LAUNCH, "campaign_usage", return_value=cap - required + 1
            ), patch.object(LAUNCH.shutil, "disk_usage", return_value=type("Usage", (), {"free": cap})()):
                with self.assertRaises(LAUNCH.LaunchError):
                    LAUNCH.reserve_campaign_capacity("fixture", additional_needed=extra)

    def test_cli_success_requires_the_matching_captured_result(self) -> None:
        cases = (
            ("preparation", "preparation-export-captured"),
            ("fixture", "bounded-evidence-captured"),
            ("inspection", "inspection-evidence-captured"),
        )
        for kind, captured in cases:
            argv = [
                "start", "--kind", kind, "--case-id", "synthetic", "--run-id",
                "12345678-1234-4234-8234-123456789abc", "--manifest", "manifest.json",
                "--controller-release", "release.json", "--release-sha256", "a" * 64,
                "--confirm", "synthetic",
            ]
            with self.subTest(kind=kind), patch.object(
                LAUNCH, "run_vm", return_value={"result": captured}
            ):
                self.assertEqual(LAUNCH.main(argv), 0)
            with self.subTest(kind=kind, failure=True), patch.object(
                LAUNCH, "run_vm", return_value={"result": "failure"}
            ):
                self.assertNotEqual(LAUNCH.main(argv), 0)
        wrong_phase_argv = [
            "start", "--kind", "fixture", "--case-id", "synthetic", "--run-id",
            "12345678-1234-4234-8234-123456789abc", "--manifest", "manifest.json",
            "--controller-release", "release.json", "--release-sha256", "a" * 64,
            "--confirm", "synthetic",
        ]
        with patch.object(LAUNCH, "run_vm", return_value={"result": "inspection-evidence-captured"}):
            self.assertNotEqual(LAUNCH.main(wrong_phase_argv), 0)


if __name__ == "__main__":
    unittest.main()
