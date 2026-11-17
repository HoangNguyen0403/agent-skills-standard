#!/usr/bin/env python3
"""Behavioral tests for record_dispatch.py: field mapping, replay, lock, and refusal boundaries."""

import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile
import time
import unittest
import unittest.mock
from pathlib import Path

SCRIPT = (
    Path(__file__).resolve().parents[3]
    / "skills/common/common-subagent-driven-development/scripts/record_dispatch.py"
)

CHANGE = "chg-1"
REVISION = "r1"
SOURCE = "record-dispatch"
DISPATCH_AT = "2026-01-05T10:00:00Z"
DISPATCHED_AT = "2026-01-05T10:00:00.000Z"
ROUND_AT = "2026-01-05T11:00:00Z"
SECOND_ROUND_AT = "2026-01-05T12:00:00Z"
VERDICT_AT = "2026-01-05T13:00:00Z"
END_AT = "2026-01-05T14:00:00Z"


def expected_id(kind, identity_key):
    digest = hashlib.sha256(identity_key.encode("utf-8")).hexdigest()[:32]
    return f"{kind}#{digest}"


def load_module():
    spec = importlib.util.spec_from_file_location("record_dispatch_under_test", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


HOLDER_SCRIPT = r"""
import json, os, sys
path = sys.argv[1]
lock = path + ".lock"
descriptor = os.open(lock, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o644)
with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
    json.dump({"pid": os.getpid(), "created_at": "2026-01-05T10:00:00.000Z"}, handle)
print("locked", flush=True)
sys.stdin.readline()
with open(path, encoding="utf-8") as handle:
    data = json.load(handle)
data["events"].append({
    "id": "dispatch#held",
    "change_id": "chg-1",
    "revision": "r1",
    "observed_at": "2026-01-05T10:30:00.000Z",
    "source_ref": "held-writer",
    "kind": "dispatch",
    "dispatch_id": "d-held",
    "role": "implementer",
    "capability_hint": "standard",
    "actual": {"provider": "unknown", "model": "unknown", "effort": "unknown"},
    "authority_ref": "plan-1",
    "orchestrator_model": "unknown",
    "orchestrator_ref": "orch-1",
})
with open(path, "w", encoding="utf-8") as handle:
    json.dump(data, handle)
os.unlink(lock)
print("released", flush=True)
"""


class LiveLock:
    """A live competing writer that holds the lock until `release()`."""

    def __init__(self, path):
        self.path = path
        self.process = None

    def __enter__(self):
        self.process = subprocess.Popen(
            [sys.executable, "-c", HOLDER_SCRIPT, str(self.path)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        self._expect("locked")
        return self

    def _expect(self, token):
        line = self.process.stdout.readline().strip()
        if line != token:
            raise AssertionError(f"holder emitted {line!r} instead of {token!r}: {self.process.stderr.read()}")

    def release(self):
        self.process.stdin.write("\n")
        self.process.stdin.flush()
        self._expect("released")
        self.process.wait(timeout=30)

    def __exit__(self, *exception):
        if self.process is not None:
            if self.process.poll() is None:
                self.process.kill()
                self.process.wait(timeout=30)
            for stream in (self.process.stdin, self.process.stdout, self.process.stderr):
                if stream is not None and not stream.closed:
                    stream.close()
        return False


def run(args, env=None):
    return subprocess.run(
        [sys.executable, str(SCRIPT), *args],
        capture_output=True,
        text=True,
        env={**os.environ, **(env or {})},
    )


class Observations:
    """A temporary observation root and the commands that write into it."""

    def __init__(self):
        self._dir = tempfile.TemporaryDirectory()
        self.root = Path(self._dir.name)
        self.path = self.root / "artifacts" / "metrics" / "delivery-observations.json"

    def cleanup(self):
        self._dir.cleanup()

    def data(self):
        return json.loads(self.path.read_text(encoding="utf-8"))

    def events(self):
        return self.data()["events"]

    def write_raw(self, payload):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(payload), encoding="utf-8")

    def dispatch(self, dispatch_id="d-1", observed=DISPATCH_AT, role="implementer", capability_hint="standard", **overrides):
        args = [
            "dispatch",
            "--observations", str(self.path),
            "--change", CHANGE,
            "--revision", REVISION,
            "--dispatch-id", dispatch_id,
            "--role", role,
            "--capability-hint", capability_hint,
            "--provider", "unknown",
            "--model", "m1",
            "--effort", "unknown",
            "--authority-ref", "plan-07",
            "--orchestrator-ref", "orch-1",
            "--observed-at", observed,
        ]
        for flag, value in overrides.items():
            args.extend([f"--{flag.replace('_', '-')}", value])
        return run(args)

    def round(self, dispatch_id="d-1", round_number="1", observed=ROUND_AT):
        return run([
            "round",
            "--observations", str(self.path),
            "--change", CHANGE,
            "--revision", REVISION,
            "--dispatch-id", dispatch_id,
            "--round", round_number,
            "--observed-at", observed,
        ])

    def verdict(self, dispatch_id="d-1", round_number="1", observed=VERDICT_AT, verdict="approved", reviewer_ref="rev-1"):
        return run([
            "verdict",
            "--observations", str(self.path),
            "--change", CHANGE,
            "--revision", REVISION,
            "--dispatch-id", dispatch_id,
            "--round", round_number,
            "--verdict", verdict,
            "--reviewer-ref", reviewer_ref,
            "--observed-at", observed,
        ])

    def acceptance(self, dispatch_id="d-1", round_number="1", observed=VERDICT_AT, decision="accepted"):
        return run([
            "acceptance",
            "--observations", str(self.path),
            "--change", CHANGE,
            "--revision", REVISION,
            "--dispatch-id", dispatch_id,
            "--round", round_number,
            "--decision", decision,
            "--authority-ref", "maintainer-1",
            "--observed-at", observed,
        ])

    def end(self, dispatch_id="d-1", observed=END_AT, state="completed"):
        return run([
            "end",
            "--observations", str(self.path),
            "--change", CHANGE,
            "--revision", REVISION,
            "--dispatch-id", dispatch_id,
            "--state", state,
            "--observed-at", observed,
        ])

    def coverage(self, complete=False, frm="2026-01-05T00:00:00Z", through="2026-01-06T00:00:00Z"):
        args = [
            "coverage",
            "--observations", str(self.path),
            "--change", CHANGE,
            "--revision", REVISION,
            "--from", frm,
            "--through", through,
        ]
        if complete:
            args.append("--complete")
        return run(args)


class RecordDispatchTest(unittest.TestCase):
    def setUp(self):
        self.obs = Observations()
        self.addCleanup(self.obs.cleanup)

    def assertOk(self, result):
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")


class FileCreationTest(RecordDispatchTest):
    def test_creates_file_with_schema_metadata(self):
        self.assertOk(self.obs.dispatch())
        data = self.obs.data()
        self.assertEqual(data["schema_version"], 1)
        self.assertEqual(data["source_kind"], "operator-recorded")
        self.assertEqual(data["coverage"], [])
        self.assertEqual(len(data["events"]), 1)


class DispatchCommandTest(RecordDispatchTest):
    def test_dispatch_records_fields_and_derives_id(self):
        self.assertOk(self.obs.dispatch())
        event = self.obs.events()[0]
        self.assertEqual(event["id"], expected_id("dispatch", "dispatch|d-1"))
        self.assertEqual(event["kind"], "dispatch")
        self.assertEqual(event["change_id"], CHANGE)
        self.assertEqual(event["revision"], REVISION)
        self.assertEqual(event["source_ref"], SOURCE)
        self.assertEqual(event["observed_at"], "2026-01-05T10:00:00.000Z")
        self.assertEqual(event["dispatch_id"], "d-1")
        self.assertEqual(event["role"], "implementer")
        self.assertEqual(event["capability_hint"], "standard")
        self.assertEqual(event["actual"], {"provider": "unknown", "model": "m1", "effort": "unknown"})
        self.assertEqual(event["authority_ref"], "plan-07")
        self.assertEqual(event["orchestrator_model"], "unknown")
        self.assertEqual(event["orchestrator_ref"], "orch-1")

    def test_round_verdict_acceptance_end_record_their_fields(self):
        self.assertOk(self.obs.dispatch())
        self.assertOk(self.obs.round())
        self.assertOk(self.obs.verdict())
        # SRS-005: an acceptance decision requires the terminal state to exist in the file.
        self.assertOk(self.obs.end())
        self.assertOk(self.obs.acceptance())
        events = {event["kind"]: event for event in self.obs.events()}
        self.assertEqual(sorted(events), ["dispatch", "dispatch-acceptance", "dispatch-end", "dispatch-round", "dispatch-verdict"])
        self.assertEqual(events["dispatch-round"]["id"], expected_id("dispatch-round", "dispatch-round|d-1|1"))
        self.assertEqual(events["dispatch-round"]["round"], 1)
        self.assertEqual(
            events["dispatch-verdict"]["id"], expected_id("dispatch-verdict", "dispatch-verdict|d-1|1|rev-1")
        )
        self.assertEqual(events["dispatch-verdict"]["verdict"], "approved")
        self.assertEqual(events["dispatch-acceptance"]["id"], expected_id("dispatch-acceptance", "dispatch-acceptance|d-1"))
        self.assertEqual(events["dispatch-acceptance"]["decision"], "accepted")
        self.assertEqual(events["dispatch-acceptance"]["authority_ref"], "maintainer-1")
        self.assertEqual(events["dispatch-end"]["id"], expected_id("dispatch-end", "dispatch-end|d-1"))
        self.assertEqual(events["dispatch-end"]["state"], "completed")

    def test_no_identity_field_carries_a_pipe(self):
        self.assertOk(self.obs.dispatch())
        self.assertNotIn("|", self.obs.events()[0]["id"])


class CoverageCommandTest(RecordDispatchTest):
    def test_coverage_lists_the_five_recorded_kinds(self):
        self.assertOk(self.obs.coverage(complete=False))
        entry = self.obs.data()["coverage"][0]
        self.assertEqual(entry["change_id"], CHANGE)
        self.assertEqual(entry["revisions"], [REVISION])
        self.assertEqual(entry["from"], "2026-01-05T00:00:00.000Z")
        self.assertEqual(entry["through"], "2026-01-06T00:00:00.000Z")
        self.assertEqual(
            entry["kinds"],
            ["dispatch", "dispatch-round", "dispatch-verdict", "dispatch-acceptance", "dispatch-end"],
        )
        self.assertIs(entry["complete"], False)

    def test_coverage_complete_flag_sets_complete(self):
        self.assertOk(self.obs.coverage(complete=True))
        self.assertIs(self.obs.data()["coverage"][0]["complete"], True)

    def test_identical_coverage_replay_is_a_noop(self):
        self.assertOk(self.obs.coverage(complete=True))
        before = self.obs.path.read_bytes()
        self.assertOk(self.obs.coverage(complete=True))
        self.assertEqual(len(self.obs.data()["coverage"]), 1)
        self.assertEqual(self.obs.path.read_bytes(), before)

    def test_coverage_rejects_an_inverted_window(self):
        result = self.obs.coverage(frm="2026-01-06T00:00:00Z", through="2026-01-05T00:00:00Z")
        self.assertEqual(result.returncode, 1)
        self.assertFalse(self.obs.path.exists())


class ReplayTest(RecordDispatchTest):
    def test_identical_replay_is_a_noop(self):
        self.assertOk(self.obs.dispatch())
        before = self.obs.path.read_bytes()
        result = self.obs.dispatch()
        self.assertOk(result)
        self.assertIn("noop", result.stdout)
        self.assertEqual(len(self.obs.events()), 1)
        self.assertEqual(self.obs.path.read_bytes(), before)

    def test_conflicting_replay_exits_one_and_leaves_the_file_unchanged(self):
        self.assertOk(self.obs.dispatch())
        before = self.obs.path.read_bytes()
        result = self.obs.dispatch(role="reviewer")
        self.assertEqual(result.returncode, 1)
        self.assertIn("conflicting-replay", result.stderr)
        self.assertEqual(self.obs.path.read_bytes(), before)


class ReferenceBoundaryTest(RecordDispatchTest):
    def test_path_bearing_value_is_refused_without_echo(self):
        result = self.obs.dispatch(dispatch_id="/tmp/secret/dispatch")
        self.assertEqual(result.returncode, 1)
        combined = result.stdout + result.stderr
        self.assertNotIn("/tmp/secret", combined)
        self.assertNotIn("secret", combined)
        self.assertIn("invalid-reference", combined)
        self.assertIn("dispatch_id", combined)
        self.assertFalse(self.obs.path.exists())

    def test_whitespace_bearing_value_is_refused(self):
        result = self.obs.dispatch(role="main implementer")
        self.assertEqual(result.returncode, 1)
        self.assertNotIn("main implementer", result.stdout + result.stderr)

    def test_trailing_newline_is_refused(self):
        # `re.match` with `$` accepts a trailing newline; `fullmatch` must not.
        result = self.obs.dispatch(dispatch_id="d-nl\n")
        self.assertEqual(result.returncode, 1)
        self.assertIn("invalid-reference", result.stderr)
        self.assertFalse(self.obs.path.exists())

    def test_leading_space_is_refused(self):
        result = self.obs.dispatch(role=" implementer")
        self.assertEqual(result.returncode, 1)
        self.assertIn("invalid-reference", result.stderr)

    def test_trailing_space_is_refused(self):
        result = self.obs.dispatch(role="implementer ")
        self.assertEqual(result.returncode, 1)
        self.assertIn("invalid-reference", result.stderr)


class IdentityTest(RecordDispatchTest):
    def test_id_is_the_kind_and_the_first_32_hex_characters(self):
        self.assertOk(self.obs.dispatch())
        identifier = self.obs.events()[0]["id"]
        self.assertEqual(identifier, expected_id("dispatch", "dispatch|d-1"))
        self.assertRegex(identifier, r"^dispatch#[0-9a-f]{32}$")

    def test_128_character_dispatch_id_produces_a_short_id(self):
        long_id = "a" * 128
        self.assertOk(self.obs.dispatch(dispatch_id=long_id))
        identifier = self.obs.events()[0]["id"]
        self.assertEqual(identifier, expected_id("dispatch", f"dispatch|{long_id}"))
        self.assertEqual(len(identifier), len("dispatch#") + 32)
        self.assertLessEqual(len(identifier), 60)

    def test_former_collision_pair_now_produces_distinct_ids(self):
        self.assertOk(self.obs.dispatch(dispatch_id="d#1"))
        self.assertOk(self.obs.dispatch(dispatch_id="d"))
        self.assertOk(self.obs.round(dispatch_id="d#1", round_number="1"))
        self.assertOk(self.obs.round(dispatch_id="d", round_number="1"))
        self.assertOk(self.obs.verdict(dispatch_id="d#1", round_number="1", reviewer_ref="r"))
        self.assertOk(self.obs.verdict(dispatch_id="d", round_number="1", reviewer_ref="1#r"))
        identifiers = {event["id"] for event in self.obs.events() if event["kind"] == "dispatch-verdict"}
        self.assertEqual(len(identifiers), 2, "the former identity collision must not collapse two verdicts")
        self.assertIn(expected_id("dispatch-verdict", "dispatch-verdict|d#1|1|r"), identifiers)
        self.assertIn(expected_id("dispatch-verdict", "dispatch-verdict|d|1|1#r"), identifiers)

    def test_existing_id_with_a_different_identity_is_refused(self):
        stolen = expected_id("dispatch", "dispatch|d-1")
        self.obs.write_raw({
            "schema_version": 1,
            "source_kind": "operator-recorded",
            "coverage": [],
            "events": [{
                "id": stolen,
                "change_id": CHANGE,
                "revision": REVISION,
                "observed_at": "2026-01-05T09:00:00.000Z",
                "source_ref": "fixture",
                "kind": "dispatch-end",
                "dispatch_id": "d-1",
                "state": "completed",
            }],
        })
        before = self.obs.path.read_bytes()
        result = self.obs.dispatch()
        self.assertEqual(result.returncode, 1)
        self.assertIn("id-collision", result.stderr)
        self.assertEqual(self.obs.path.read_bytes(), before)


class LockTest(RecordDispatchTest):
    def test_lock_held_by_a_live_process_times_out_without_writing(self):
        self.assertOk(self.obs.dispatch())
        before = self.obs.path.read_bytes()
        with LiveLock(self.obs.path):
            result = run([
                "round",
                "--observations", str(self.obs.path),
                "--change", CHANGE,
                "--revision", REVISION,
                "--dispatch-id", "d-1",
                "--round", "1",
                "--observed-at", ROUND_AT,
                "--lock-timeout-ms", "300",
            ])
            self.assertEqual(result.returncode, 1)
            self.assertIn("lock-timeout", result.stderr)
            self.assertEqual(self.obs.path.read_bytes(), before)
            self.assertTrue(self.obs.path.with_suffix(".json.lock").exists(), "a foreign lock is never removed")

    def test_lock_timeout_is_configurable_by_environment(self):
        self.assertOk(self.obs.dispatch())
        with LiveLock(self.obs.path):
            result = run(
                [
                    "round",
                    "--observations", str(self.obs.path),
                    "--change", CHANGE,
                    "--revision", REVISION,
                    "--dispatch-id", "d-1",
                    "--round", "1",
                    "--observed-at", ROUND_AT,
                ],
                env={"AGS_OBSERVATIONS_LOCK_TIMEOUT_MS": "300"},
            )
            self.assertEqual(result.returncode, 1)
            self.assertIn("lock-timeout", result.stderr)

    def test_writer_waits_for_a_live_holder_and_keeps_both_events(self):
        self.assertOk(self.obs.dispatch(dispatch_id="d-1"))
        with LiveLock(self.obs.path) as holder:
            writer = subprocess.Popen(
                [
                    sys.executable, str(SCRIPT), "dispatch",
                    "--observations", str(self.obs.path),
                    "--change", CHANGE,
                    "--revision", REVISION,
                    "--dispatch-id", "d-2",
                    "--role", "implementer",
                    "--capability-hint", "fast",
                    "--authority-ref", "plan-07",
                    "--observed-at", "2026-01-05T11:00:00Z",
                ],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            time.sleep(0.5)
            self.assertIsNone(writer.poll(), "the writer must wait while a live process holds the lock")
            self.assertNotIn(
                "d-2",
                {event.get("dispatch_id") for event in self.obs.events()},
                "a waiting writer must not write before it owns the lock",
            )
            holder.release()
            stdout, stderr = writer.communicate(timeout=30)
        self.assertEqual(writer.returncode, 0, stderr)
        self.assertIn("wrote", stdout)
        recorded = {event.get("dispatch_id") for event in self.obs.events()}
        self.assertEqual(
            recorded,
            {"d-1", "d-held", "d-2"},
            "the waiting writer must re-read after it acquires the lock and keep the holder's event",
        )

    def test_two_interleaved_writers_both_survive(self):
        self.assertOk(self.obs.dispatch(dispatch_id="d-1"))
        args = [
            [
                "dispatch",
                "--observations", str(self.obs.path),
                "--change", CHANGE,
                "--revision", REVISION,
                "--dispatch-id", dispatch_id,
                "--role", "implementer",
                "--capability-hint", "fast",
                "--authority-ref", "plan-07",
                "--observed-at", DISPATCH_AT,
            ]
            for dispatch_id in ("d-2", "d-3")
        ]
        processes = [
            subprocess.Popen(
                [sys.executable, str(SCRIPT), *command],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
            )
            for command in args
        ]
        for process in processes:
            stdout, stderr = process.communicate(timeout=30)
            self.assertEqual(process.returncode, 0, stderr)
        recorded = {event["dispatch_id"] for event in self.obs.events()}
        self.assertEqual(recorded, {"d-1", "d-2", "d-3"})


class LockCleanupTest(unittest.TestCase):
    def test_lock_is_removed_when_metadata_initialization_fails(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as directory:
            lock = os.path.join(directory, "delivery-observations.json.lock")
            with unittest.mock.patch.object(module.json, "dump", side_effect=OSError("disk full")):
                with self.assertRaises(module.Rejected) as raised:
                    module.acquire_lock(lock, 100)
            self.assertEqual(raised.exception.code, "lock-unavailable")
            self.assertFalse(os.path.exists(lock), "a lock created by this process is removed on failure")


class InvariantTest(RecordDispatchTest):
    def test_round_for_an_unknown_dispatch_is_refused(self):
        result = self.obs.round(dispatch_id="d-missing")
        self.assertEqual(result.returncode, 1)
        self.assertIn("unknown-dispatch", result.stderr)
        self.assertFalse(self.obs.path.exists())

    def test_round_before_its_dispatch_is_refused(self):
        self.assertOk(self.obs.dispatch(observed=ROUND_AT))
        result = self.obs.round(observed="2026-01-05T10:30:00Z")
        self.assertEqual(result.returncode, 1)
        self.assertIn("precedes-dispatch", result.stderr)

    def test_acceptance_for_a_non_last_round_is_refused(self):
        self.assertOk(self.obs.dispatch())
        self.assertOk(self.obs.round(round_number="1"))
        self.assertOk(self.obs.round(round_number="2", observed=SECOND_ROUND_AT))
        result = self.obs.acceptance(round_number="1")
        self.assertEqual(result.returncode, 1)
        self.assertIn("acceptance-not-last-round", result.stderr)

    def test_acceptance_after_a_non_completed_end_is_refused(self):
        self.assertOk(self.obs.dispatch())
        self.assertOk(self.obs.round())
        self.assertOk(self.obs.end(state="cancelled"))
        result = self.obs.acceptance(observed="2026-01-05T15:00:00Z")
        self.assertEqual(result.returncode, 1)
        self.assertIn("accepted-after-non-completed", result.stderr)


class DiagnosticsTest(RecordDispatchTest):
    def test_invalid_choice_names_the_argument_without_echoing_the_value(self):
        supplied = "super/../fast"
        result = self.obs.dispatch(capability_hint=supplied)
        self.assertEqual(result.returncode, 2)
        combined = result.stdout + result.stderr
        self.assertNotIn(supplied, combined)
        self.assertNotIn("Traceback", combined)
        self.assertIn("invalid-choice", combined)
        self.assertIn("capability_hint", combined)

    def test_unrecognized_argument_does_not_echo_the_value(self):
        result = run([
            "round",
            "--observations", str(self.obs.path),
            "--change", CHANGE,
            "--revision", REVISION,
            "--dispatch-id", "d-1",
            "--round", "1",
            "--bogus", "/tmp/leak/value",
        ])
        self.assertEqual(result.returncode, 2)
        combined = result.stdout + result.stderr
        self.assertNotIn("/tmp/leak", combined)
        self.assertNotIn("Traceback", combined)
        self.assertIn("usage-error", combined)

    def test_filesystem_error_is_reported_by_code(self):
        blocker = self.obs.root / "blocker"
        blocker.write_text("not a directory", encoding="utf-8")
        result = run([
            "dispatch",
            "--observations", str(blocker / "delivery-observations.json"),
            "--change", CHANGE,
            "--revision", REVISION,
            "--dispatch-id", "d-1",
            "--role", "implementer",
            "--capability-hint", "standard",
            "--authority-ref", "plan-07",
        ])
        self.assertEqual(result.returncode, 1)
        combined = result.stdout + result.stderr
        self.assertNotIn(str(self.obs.root), combined)
        self.assertNotIn("Traceback", combined)
        self.assertIn("filesystem-error", combined)

    def test_calendar_error_is_reported_by_code(self):
        result = self.obs.dispatch(observed="0000-01-01T00:00:00Z")
        self.assertEqual(result.returncode, 1)
        combined = result.stdout + result.stderr
        self.assertNotIn("0000-01-01", combined)
        self.assertNotIn("Traceback", combined)
        self.assertIn("invalid-timestamp", combined)


class UsageTest(RecordDispatchTest):
    def test_unknown_kind_is_a_usage_error(self):
        result = run(["bogus", "--observations", str(self.obs.path)])
        self.assertEqual(result.returncode, 2)

    def test_missing_required_field_is_a_usage_error(self):
        result = run(["round", "--observations", str(self.obs.path), "--change", CHANGE])
        self.assertEqual(result.returncode, 2)

    def test_corrupt_observation_file_is_refused(self):
        self.obs.path.parent.mkdir(parents=True, exist_ok=True)
        self.obs.path.write_text("{ not json", encoding="utf-8")
        result = self.obs.dispatch()
        self.assertEqual(result.returncode, 1)
        self.assertIn("invalid-observations", result.stderr)
        self.assertEqual(self.obs.path.read_text(encoding="utf-8"), "{ not json")

    def test_negative_lock_timeout_is_a_usage_error(self):
        result = self.obs.dispatch(lock_timeout_ms="-1")
        self.assertEqual(result.returncode, 2)
        self.assertFalse(self.obs.path.exists())


if __name__ == "__main__":
    unittest.main()
