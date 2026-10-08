import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).resolve().parents[2] / "skills/common/common-subagent-driven-development/scripts/sdd_progress.py"


class ProgressReceiptTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(prefix="ags-progress-")
        self.root = Path(self.temporary.name)
        self.workspace = self.root / "workspace"
        self.workspace.mkdir()
        self.plan = self.root / "plan.md"
        self.plan.write_text("planning → repair → acceptance\n", encoding="utf-8")
        self.state = self.root / "state.json"
        self.evidence = self.workspace / "receipt.txt"
        self.evidence.write_text("verified result\n", encoding="utf-8")
        self.observation = self.root / "observation.json"
        initialized = subprocess.run([
            sys.executable, str(SCRIPT), "init", "--state", str(self.state), "--plan", str(self.plan),
            "--workspace", str(self.workspace), "--actions", "planning", "repair", "acceptance",
            "--revision", "rev-123", "--dirty-identity", "dirty-sha-456",
        ], capture_output=True, text=True, check=True)
        self.assertEqual(json.loads(initialized.stdout)["next_action"], "planning")

    def tearDown(self):
        self.temporary.cleanup()

    def receipt(self, completion_id, action_id, outcome="completed", **updates):
        result = {
            "completion_id": completion_id,
            "plan": str(self.plan),
            "workspace": str(self.workspace),
            "action_id": action_id,
            "outcome": outcome,
            "evidence": ["receipt.txt"],
            "verified_revision": "rev-123",
            "current_revision": "rev-123",
            "dirty_identity": "dirty-sha-456",
            "owner": "implementer-a",
            "owner_paused": True,
            "human_wait_seconds": None,
            "worker_started_at": None,
            "worker_completed_at": None,
            "notification_delay_seconds": None,
        }
        result.update(updates)
        self.observation.write_text(json.dumps(result), encoding="utf-8")
        return result

    def reconcile(self):
        return subprocess.run([sys.executable, str(SCRIPT), "reconcile", "--state", str(self.state), "--observation", str(self.observation)], capture_output=True, text=True)

    def test_completion_receipt_advances_once_and_restart_replay_is_idempotent(self):
        self.receipt("plan-done", "planning")
        first = self.reconcile()
        self.assertEqual(first.returncode, 0, first.stderr)
        self.assertEqual(json.loads(first.stdout)["cursor"], 1)
        saved = json.loads(self.state.read_text(encoding="utf-8"))
        self.assertIsNone(saved["completions"]["plan-done"]["timings"]["human_wait_seconds"])
        self.assertEqual(self.reconcile().returncode, 0)
        replay = json.loads(self.reconcile().stdout)
        self.assertEqual(replay["cursor"], 1)
        self.assertTrue(replay["duplicate"])
        self.receipt("plan-done", "repair")
        changed_reuse = self.reconcile()
        self.assertEqual(changed_reuse.returncode, 2)
        self.assertIn("reused", changed_reuse.stderr)

    def test_blocked_scope_receipt_retains_cursor_then_new_explicit_owner_receipt_advances(self):
        self.receipt("repair-blocked", "planning", "blocked", blocked_reason="scope/spend authority missing", evidence=[])
        blocked = self.reconcile()
        self.assertEqual(blocked.returncode, 0, blocked.stderr)
        self.assertEqual(json.loads(blocked.stdout)["cursor"], 0)
        self.receipt("plan-done", "planning")
        complete = self.reconcile()
        self.assertEqual(complete.returncode, 0, complete.stderr)
        self.assertEqual(json.loads(complete.stdout)["next_action"], "repair")

    def test_planning_repair_acceptance_subprocess_checkpoints_survive_restart(self):
        self.receipt("planning-1", "planning")
        planning = self.reconcile()
        self.assertEqual(planning.returncode, 0, planning.stderr)
        self.assertEqual(json.loads(planning.stdout)["next_action"], "repair")
        replay = self.reconcile()
        self.assertEqual(replay.returncode, 0, replay.stderr)
        self.assertTrue(json.loads(replay.stdout)["duplicate"])

        self.receipt("repair-blocked", "repair", "blocked", blocked_reason="scope/spend authority unavailable", evidence=[])
        blocked = self.reconcile()
        self.assertEqual(blocked.returncode, 0, blocked.stderr)
        self.assertEqual(json.loads(blocked.stdout)["cursor"], 1)

        self.receipt("repair-stale", "repair", current_revision="old-revision")
        stale = self.reconcile()
        self.assertEqual(stale.returncode, 2)
        self.assertEqual(json.loads(self.state.read_text(encoding="utf-8"))["cursor"], 1)

        self.receipt("repair-1", "repair")
        repaired = self.reconcile()
        self.assertEqual(repaired.returncode, 0, repaired.stderr)
        self.assertEqual(json.loads(repaired.stdout)["next_action"], "acceptance")
        self.receipt("acceptance-1", "acceptance")
        accepted = self.reconcile()
        self.assertEqual(accepted.returncode, 0, accepted.stderr)
        self.assertEqual(json.loads(accepted.stdout)["status"], "complete")
        final_state = json.loads(self.state.read_text(encoding="utf-8"))
        self.assertEqual(final_state["cursor"], 3)
        self.assertEqual(set(final_state["completions"]), {"planning-1", "repair-blocked", "repair-1", "acceptance-1"})

    def test_stale_revisions_changed_dirty_identity_and_active_owner_cannot_advance(self):
        cases = [
            {"verified_revision": "old-rev"},
            {"current_revision": "new-rev"},
            {"dirty_identity": "changed"},
            {"owner_paused": False},
        ]
        for index, changes in enumerate(cases):
            self.receipt(f"stale-{index}", "planning", **changes)
            result = self.reconcile()
            self.assertEqual(result.returncode, 2)
            self.assertEqual(json.loads(self.state.read_text(encoding="utf-8"))["cursor"], 0)

    def test_plan_workspace_action_evidence_and_evidence_content_are_bound(self):
        self.receipt("wrong-action", "repair")
        self.assertEqual(self.reconcile().returncode, 2)
        self.receipt("missing-evidence", "planning", evidence=["missing.txt"])
        self.assertEqual(self.reconcile().returncode, 2)
        outside = self.root / "outside.txt"
        outside.write_text("private", encoding="utf-8")
        link = self.workspace / "escape.txt"
        link.symlink_to(outside)
        self.receipt("escaping-link", "planning", evidence=["escape.txt"])
        self.assertEqual(self.reconcile().returncode, 2)
        self.receipt("foreign-workspace", "planning", workspace=str(self.root))
        self.assertEqual(self.reconcile().returncode, 2)
        self.receipt("valid", "planning")
        self.assertEqual(self.reconcile().returncode, 0)
        self.evidence.write_text("changed evidence\n", encoding="utf-8")
        replay = self.reconcile()
        self.assertEqual(replay.returncode, 2)
        self.assertIn("evidence content", replay.stderr)

    def test_plan_content_change_rejects_receipt(self):
        self.plan.write_text("altered plan\n", encoding="utf-8")
        self.receipt("stale-plan", "planning")
        result = self.reconcile()
        self.assertEqual(result.returncode, 2)
        self.assertIn("plan content changed", result.stderr)


if __name__ == "__main__":
    unittest.main()
