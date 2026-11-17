#!/usr/bin/env python3
"""Structural contract tests for blind review dispatch and reconciliation prompts."""

import re
import unittest
from pathlib import Path

TEMPLATES = Path(__file__).resolve().parents[3] / "skills/common/common-subagent-driven-development/references/templates.md"


def section(text: str, heading: str) -> str:
    match = re.search(rf"^## {re.escape(heading)}\n(.*?)(?=^## |\Z)", text, re.MULTILINE | re.DOTALL)
    if match is None:
        raise AssertionError(f"missing template section: {heading}")
    return match.group(1)


class TestReviewDispatch(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.templates = TEMPLATES.read_text(encoding="utf-8")

    def test_blind_dispatch_uses_only_packet_diff_and_orchestrator_receipt(self):
        blind = section(self.templates, "2. Blind Task Reviewer Prompt Template")
        for required in ("[BRIEF_FILE]", "[DIFF_FILE]", "[CHECK_RECEIPT_FILE]", "Orchestrator-observed deterministic receipt", "Phase-One Findings", "[PHASE_ONE_SHA256]"):
            with self.subTest(required=required):
                self.assertIn(required, blind)
        for prohibited in ("[REPORT_FILE]", "Implementer report", "Author delivery report", "What the Implementer Claims"):
            with self.subTest(prohibited=prohibited):
                self.assertNotIn(prohibited, blind)

    def test_reconciliation_requires_frozen_phase_one_identity_and_blocks_unsupported_resume(self):
        reconcile = section(self.templates, "3. Reconciliation Prompt Template")
        for required in ("[PHASE_ONE_ARTIFACT]", "[PHASE_ONE_SHA256]", "[SOURCE_IDENTITY]", "[REPORT_FILE]", "Unsupported resume is BLOCKED", "replacement starts again"):
            with self.subTest(required=required):
                self.assertIn(required, reconcile)

    def test_fix_round_requires_cumulative_blind_freeze_before_reconciliation(self):
        fix_round = section(self.templates, "4. Fix-Round Review Route")
        for required in (
            "cumulative",
            "[BASE_REF]",
            "[CHECK_RECEIPT_FILE]",
            "[SOURCE_IDENTITY / SCOPE_DIGEST]",
            "Do not receive the fix report before the new phase-one artifact is frozen",
            "Required current-check FAIL",
            "Blocker, Major, or Nit",
            "Never write to the shared implementation worktree",
            "delivery-report.md",
        ):
            with self.subTest(required=required):
                self.assertIn(required, fix_round)
        self.assertNotIn("Critical/Important", fix_round)

    def test_fix_round_blind_phase_excludes_author_report_and_reproduction_requires_command_authority(self):
        fix_round = section(self.templates, "4. Fix-Round Review Route")
        self.assertNotIn("[REPORT_FILE]", fix_round)
        self.assertNotIn("Fix report:", fix_round)
        blind = section(self.templates, "2. Blind Task Reviewer Prompt Template")
        methodology = (TEMPLATES.parent / "methodology.md").read_text(encoding="utf-8")
        for text in (blind, methodology):
            with self.subTest(source="blind" if text is blind else "methodology"):
                self.assertIn("exact command", text)
                self.assertIn("orchestrator-published", text)

    def test_decision_evals_have_no_free_form_notes_escape(self):
        import json

        evals_path = TEMPLATES.parent.parent / "evals/evals.json"
        evals = json.loads(evals_path.read_text(encoding="utf-8"))["evals"]
        for case_id in (24, 25):
            case = next(case for case in evals if case["id"] == case_id)
            with self.subTest(case_id=case_id):
                self.assertNotIn("NOTES", case["prompt"])
                self.assertNotIn("NOTES:", case["expected_output"])
                self.assertNotIn("NOTES:", " ".join(assertion["value"] for assertion in case["assertions"]))


if __name__ == "__main__":
    unittest.main()
