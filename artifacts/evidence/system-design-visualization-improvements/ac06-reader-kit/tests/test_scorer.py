#!/usr/bin/env python3
"""Self-test for scorer.py using synthetic, clearly-labelled fake rows.

Every fixture row uses the reader id SYNTHETIC-NOT-A-READER, fabricated
timings and two fabricated session timestamps, and verdicts produced by a
synthetic adjudicator. These files live only inside a temporary directory
during the test and must never be copied into a response sheet or reported as
measured results.

Run: python3 -m unittest tests.test_scorer -v
"""

from __future__ import annotations

import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent
SCORER = KIT / "scorer.py"
KEY = KIT / "scoring-key" / "answers.json"
ARM_MAP = KIT / "scoring-key" / "arm-map.json"
QUESTIONS = KIT / "questions.json"
FAKE_READER = "SYNTHETIC-NOT-A-READER"
FAKE_ADJUDICATOR = "SYNTHETIC-NOT-A-READER-ADJUDICATOR"
SESSION_START = {"1": "2026-11-07T09:00:00Z", "2": "2026-11-09T09:00:00Z"}
DEFAULT_SECONDS = 60


def build_rows(
    seconds_for: dict | None = None,
    session_start: dict[str, str] | None = None,
    reader: str = FAKE_READER,
) -> list[dict[str, str]]:
    """Complete synthetic sheets: 6 scenarios x 2 sessions (one arm each) x 4 questions."""
    key = json.loads(KEY.read_text())
    questions = json.loads(QUESTIONS.read_text())
    arm_map = json.loads(ARM_MAP.read_text())
    seconds_for = seconds_for or {}
    session_start = session_start or SESSION_START

    rows: list[dict[str, str]] = []
    for session in ("1", "2"):
        for sid in arm_map["sessions"][session]:
            slot = arm_map["scenarios"][sid][f"session{session}"]
            for scenario in questions["scenarios"]:
                if scenario["id"] != sid:
                    continue
                for qid in scenario["questions"]:
                    applicable = key["scenarios"][sid]["questions"][qid]["applicable"]
                    seconds = seconds_for.get((slot["role"], sid), seconds_for.get(slot["role"], DEFAULT_SECONDS))
                    rows.append(
                        {
                            "session": session,
                            "session_started_utc": session_start[session],
                            "reader": reader,
                            "scenario": sid,
                            "question_id": qid,
                            "answer": "synthetic answer text",
                            "seconds": "" if not applicable else str(seconds),
                            "applicable": "true" if applicable else "false",
                            "recognised_prior": "n",
                            "notes": "",
                        }
                    )
    return rows


class ScorerTest(unittest.TestCase):
    def setUp(self) -> None:
        self._tmp = tempfile.TemporaryDirectory()
        self.tmp = Path(self._tmp.name)
        self.sheets = self.tmp / "sheets"
        self.sheets.mkdir()
        self.adj_dir = self.tmp / "adjudication"
        self.arm_map = json.loads(ARM_MAP.read_text())

    def tearDown(self) -> None:
        self._tmp.cleanup()

    # --- fixtures ------------------------------------------------------------

    def write_sheets(
        self,
        rows: list[dict[str, str]],
        header: list[str] | None = None,
        session1_name: str = "response-sheet-session1.csv",
        session2_name: str = "response-sheet-session2.csv",
    ) -> tuple[Path, Path]:
        columns = header or list(rows[0].keys())
        paths = []
        for session, name in (("1", session1_name), ("2", session2_name)):
            path = self.sheets / name
            subset = [r for r in rows if r["session"] == session]
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=columns, extrasaction="ignore")
                writer.writeheader()
                writer.writerows(subset)
            paths.append(path)
        return paths[0], paths[1]

    def write_raw(self, name: str, text: str) -> Path:
        path = self.tmp / name
        path.write_text(text, encoding="utf-8")
        return path

    def write_metadata(self, **overrides: object) -> Path:
        metadata = {
            "reader_id": FAKE_READER,
            "is_implementation_author": False,
            "date": "2026-11-09",
            "screen": "27in 2560x1440",
            "zoom": "100%",
            "theme": "light",
            "implementation_start": "2026-11-01T00:00:00Z",
            "adjudicator_id": FAKE_ADJUDICATOR,
        }
        metadata.update(overrides)
        for name in list(metadata):
            if metadata[name] is None:
                del metadata[name]
        path = self.tmp / "run-metadata.json"
        path.write_text(json.dumps(metadata))
        return path

    def run_scorer(
        self,
        sheet1: Path,
        sheet2: Path,
        metadata: Path | None = None,
        verdicts: Path | None = None,
        adjudication_map: Path | None = None,
        export: bool = False,
        key: Path = KEY,
        arm_map: Path = ARM_MAP,
    ) -> subprocess.CompletedProcess[str]:
        command = [
            sys.executable,
            "-B",
            str(SCORER),
            "--sheet1",
            str(sheet1),
            "--sheet2",
            str(sheet2),
            "--key",
            str(key),
            "--arm-map",
            str(arm_map),
        ]
        if export:
            command += ["--export-adjudication", str(self.adj_dir)]
        if verdicts is not None:
            command += ["--verdicts", str(verdicts)]
        if adjudication_map is not None:
            command += ["--adjudication-map", str(adjudication_map)]
        if metadata is not None:
            command += ["--metadata", str(metadata)]
        command += ["--json", str(self.tmp / "report.json")]
        return subprocess.run(command, capture_output=True, text=True, check=False)

    def adjudicate(self, verdict_for: dict[tuple[str, str, str], str] | None = None, default: str = "correct") -> Path:
        """Fill the exported packet as an adjudicator would, then return its path."""
        map_path = self.adj_dir / "adjudication-map.json"
        input_path = self.adj_dir / "adjudication-input.json"
        mapping = {row["token"]: row for row in json.loads(map_path.read_text())["rows"]}
        packet = json.loads(input_path.read_text())
        verdict_for = verdict_for or {}
        for row in packet["rows"]:
            entry = mapping[row["token"]]
            role = self.arm_map["scenarios"][entry["scenario"]][f"session{entry['session']}"]["role"]
            row["verdict"] = verdict_for.get((entry["scenario"], role, row["question_id"]), default)
        input_path.write_text(json.dumps(packet, indent=2))
        return input_path

    def score(
        self,
        rows: list[dict[str, str]] | None = None,
        verdict_for: dict[tuple[str, str, str], str] | None = None,
        metadata: Path | None = None,
        **kwargs: object,
    ) -> subprocess.CompletedProcess[str]:
        """Export, adjudicate, then score. Returns the scoring process."""
        rows = rows if rows is not None else build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        exported = self.run_scorer(sheet1, sheet2, export=True)
        if exported.returncode != 0:
            return exported
        verdicts = self.adjudicate(verdict_for)
        meta = metadata if metadata is not None else self.write_metadata()
        return self.run_scorer(
            sheet1,
            sheet2,
            metadata=meta,
            verdicts=verdicts,
            adjudication_map=self.adj_dir / "adjudication-map.json",
            **kwargs,
        )

    def report(self) -> dict:
        return json.loads((self.tmp / "report.json").read_text())

    # --- passing and failing runs -------------------------------------------

    def test_pass_when_targets_met(self) -> None:
        result = self.score(build_rows(seconds_for={"baseline": 60, "candidate": 40}))
        self.assertEqual(result.returncode, 0, result.stderr)
        report = self.report()
        self.assertEqual(report["status"], "PASS")
        self.assertEqual(report["arms"]["candidate"]["correct"], 24)
        self.assertEqual(report["denominators"]["applicable_answers_per_arm"], 24)
        self.assertEqual(report["arms"]["baseline"]["scenario_totals_seconds"], [240] * 6)
        self.assertEqual(report["arms"]["candidate"]["scenario_totals_seconds"], [160] * 6)
        self.assertAlmostEqual(report["checks"]["time_reduction_pct"]["value"], 33.33, places=2)
        self.assertEqual(report["regressions"], [])
        self.assertAlmostEqual(report["session_gap_hours"], 48.0, places=1)
        self.assertIn("PASS", result.stdout)

    def test_median_of_six_distinct_scenario_totals_is_even(self) -> None:
        per_question = {
            ("baseline", "S1-simple-stack"): 10,
            ("baseline", "S2-dev-tooling"): 20,
            ("baseline", "S3-long-label-hub"): 30,
            ("baseline", "S4-nested-deployment"): 40,
            ("baseline", "S5-stateful-dataflow"): 50,
            ("baseline", "S6-sdk-ipc"): 90,
        }
        result = self.score(build_rows(seconds_for={**per_question, "candidate": 20}))
        self.assertEqual(result.returncode, 0, result.stderr)
        report = self.report()
        self.assertEqual(report["arms"]["baseline"]["scenario_totals_seconds"], [40, 80, 120, 160, 200, 360])
        self.assertAlmostEqual(report["arms"]["baseline"]["median_seconds"], 140.0)

    def test_fail_on_low_correctness(self) -> None:
        wrong = {
            ("S2-dev-tooling", "candidate", "Q1"): "incorrect",
            ("S2-dev-tooling", "candidate", "Q2"): "partial",
            ("S5-stateful-dataflow", "candidate", "Q3"): "incorrect",
            ("S5-stateful-dataflow", "candidate", "Q4"): "incorrect",
        }
        result = self.score(build_rows(seconds_for={"baseline": 60, "candidate": 40}), verdict_for=wrong)
        self.assertEqual(result.returncode, 1, result.stderr)
        report = self.report()
        self.assertEqual(report["status"], "FAIL")
        self.assertEqual(report["arms"]["candidate"]["correct"], 20)
        self.assertFalse(report["checks"]["correct_pct"]["met"])
        self.assertTrue(report["checks"]["time_reduction_pct"]["met"])

    def test_fail_on_regression_even_when_targets_met(self) -> None:
        result = self.score(
            build_rows(seconds_for={"baseline": 60, "candidate": 30}),
            verdict_for={("S4-nested-deployment", "candidate", "Q2"): "incorrect"},
        )
        self.assertEqual(result.returncode, 1, result.stderr)
        report = self.report()
        self.assertEqual(report["status"], "FAIL")
        self.assertTrue(report["checks"]["correct_pct"]["met"])
        self.assertTrue(report["checks"]["time_reduction_pct"]["met"])
        self.assertFalse(report["checks"]["no_regression"]["met"])
        self.assertEqual(
            [(r["scenario"], r["question_id"]) for r in report["regressions"]],
            [("S4-nested-deployment", "Q2")],
        )

    def test_baseline_partial_candidate_correct_is_not_a_regression(self) -> None:
        result = self.score(
            build_rows(seconds_for={"baseline": 60, "candidate": 40}),
            verdict_for={("S1-simple-stack", "baseline", "Q3"): "partial"},
        )
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.report()["regressions"], [])

    def test_pending_when_reader_is_implementation_author(self) -> None:
        result = self.score(metadata=self.write_metadata(is_implementation_author=True))
        self.assertEqual(result.returncode, 3, result.stderr)
        report = self.report()
        self.assertEqual(report["status"], "PENDING")
        self.assertIn("implementation author", report["status_reason"])

    def test_pending_when_reader_adjudicated_their_own_answers(self) -> None:
        result = self.score(metadata=self.write_metadata(adjudicator_id=FAKE_READER))
        self.assertEqual(result.returncode, 3, result.stderr)
        self.assertIn("adjudicated", self.report()["status_reason"])

    def test_pending_when_session2_is_outside_the_window(self) -> None:
        rows = build_rows(session_start={"1": "2026-11-07T09:00:00Z", "2": "2026-12-20T09:00:00Z"})
        result = self.score(rows)
        self.assertEqual(result.returncode, 3, result.stderr)
        report = self.report()
        self.assertEqual(report["status"], "PENDING")
        self.assertIn("30 days", report["status_reason"])

    # --- metadata rejections (exit 2) ---------------------------------------

    def test_reject_missing_implementation_start(self) -> None:
        result = self.score(metadata=self.write_metadata(implementation_start=None))
        self.assertEqual(result.returncode, 2)
        self.assertIn("implementation_start", result.stderr)

    def test_reject_missing_configuration_field(self) -> None:
        for field in ("screen", "zoom", "theme", "date", "adjudicator_id"):
            with self.subTest(field=field):
                result = self.score(metadata=self.write_metadata(**{field: None}))
                self.assertEqual(result.returncode, 2)
                self.assertIn(field, result.stderr)

    def test_reject_bad_theme_and_zoom(self) -> None:
        result = self.score(metadata=self.write_metadata(theme="dark"))
        self.assertEqual(result.returncode, 2)
        self.assertIn("theme", result.stderr)
        result = self.score(metadata=self.write_metadata(zoom="125%"))
        self.assertEqual(result.returncode, 2)
        self.assertIn("zoom", result.stderr)

    def test_reject_session_before_implementation_start(self) -> None:
        result = self.score(metadata=self.write_metadata(implementation_start="2026-11-08T00:00:00Z"))
        self.assertEqual(result.returncode, 2)
        self.assertIn("before implementation_start", result.stderr)

    def test_reject_metadata_reader_mismatch(self) -> None:
        result = self.score(metadata=self.write_metadata(reader_id="SOMEONE-ELSE"))
        self.assertEqual(result.returncode, 2)
        self.assertIn("does not match", result.stderr)

    def test_reject_missing_metadata_file(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        verdicts = self.adjudicate()
        result = self.run_scorer(
            sheet1, sheet2, verdicts=verdicts, adjudication_map=self.adj_dir / "adjudication-map.json"
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("--metadata", result.stderr)

    def test_reject_non_object_metadata(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        verdicts = self.adjudicate()
        metadata = self.write_raw("bad-metadata.json", json.dumps([FAKE_READER]))
        result = self.run_scorer(
            sheet1,
            sheet2,
            metadata=metadata,
            verdicts=verdicts,
            adjudication_map=self.adj_dir / "adjudication-map.json",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("JSON object", result.stderr)

    # --- adjudication rejections (exit 2) -----------------------------------

    def test_reject_missing_verdict_arguments(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, metadata=self.write_metadata())
        self.assertEqual(result.returncode, 2)
        self.assertIn("--export-adjudication", result.stderr)

    def test_reject_incomplete_verdict_coverage(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        verdicts = self.adjudicate()
        packet = json.loads(verdicts.read_text())
        packet["rows"].pop()
        verdicts.write_text(json.dumps(packet, indent=2))
        result = self.run_scorer(
            sheet1,
            sheet2,
            metadata=self.write_metadata(),
            verdicts=verdicts,
            adjudication_map=self.adj_dir / "adjudication-map.json",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("exactly once", result.stderr)

    def test_reject_duplicate_verdict_rows(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        verdicts = self.adjudicate()
        packet = json.loads(verdicts.read_text())
        packet["rows"].append(dict(packet["rows"][0]))
        verdicts.write_text(json.dumps(packet, indent=2))
        result = self.run_scorer(
            sheet1,
            sheet2,
            metadata=self.write_metadata(),
            verdicts=verdicts,
            adjudication_map=self.adj_dir / "adjudication-map.json",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("more than one verdict", result.stderr)

    def test_reject_unknown_verdict_token(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        verdicts = self.adjudicate()
        packet = json.loads(verdicts.read_text())
        packet["rows"][0]["token"] = "deadbeefdeadbeef"
        verdicts.write_text(json.dumps(packet, indent=2))
        result = self.run_scorer(
            sheet1,
            sheet2,
            metadata=self.write_metadata(),
            verdicts=verdicts,
            adjudication_map=self.adj_dir / "adjudication-map.json",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("unknown token", result.stderr)

    def test_reject_bad_verdict_value(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        verdicts = self.adjudicate()
        packet = json.loads(verdicts.read_text())
        packet["rows"][0]["verdict"] = "maybe"
        verdicts.write_text(json.dumps(packet, indent=2))
        result = self.run_scorer(
            sheet1,
            sheet2,
            metadata=self.write_metadata(),
            verdicts=verdicts,
            adjudication_map=self.adj_dir / "adjudication-map.json",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("must be one of", result.stderr)

    def test_reject_verdict_for_a_different_answer(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        verdicts = self.adjudicate()
        packet = json.loads(verdicts.read_text())
        packet["rows"][0]["answer"] = "an answer the sheet does not contain"
        verdicts.write_text(json.dumps(packet, indent=2))
        result = self.run_scorer(
            sheet1,
            sheet2,
            metadata=self.write_metadata(),
            verdicts=verdicts,
            adjudication_map=self.adj_dir / "adjudication-map.json",
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("no longer matches", result.stderr)

    def test_reject_adjudication_map_missing_rows(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        verdicts = self.adjudicate(default="correct")
        map_path = self.adj_dir / "adjudication-map.json"
        mapping = json.loads(map_path.read_text())
        mapping["rows"].pop()
        map_path.write_text(json.dumps(mapping))
        result = self.run_scorer(
            sheet1,
            sheet2,
            metadata=self.write_metadata(),
            verdicts=verdicts,
            adjudication_map=map_path,
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("missing rows", result.stderr)

    def test_export_contains_no_session_timing_or_arm(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        self.run_scorer(sheet1, sheet2, export=True)
        packet = json.loads((self.adj_dir / "adjudication-input.json").read_text())
        text = json.dumps(packet).lower()
        for forbidden in ("session_started", "seconds", "arm", "baseline", "candidate"):
            self.assertNotIn(forbidden, text)
        for row in packet["rows"]:
            self.assertEqual(set(row), {"token", "scenario", "question_id", "answer", "verdict"})
        self.assertEqual(len(packet["rows"]), 48)

    # --- malformed sheet rejections (exit 2) --------------------------------

    def test_reject_unquoted_comma_in_answer(self) -> None:
        sheet1, sheet2 = self.write_sheets(build_rows())
        text = sheet1.read_text(encoding="utf-8").splitlines()
        text[1] = text[1].replace("synthetic answer text", "Storefront, Order API, Orders DB")
        broken = Path(str(sheet1) + ".broken.csv")
        broken.write_text("\n".join(text) + "\n", encoding="utf-8")
        result = self.run_scorer(broken, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("fields", result.stderr)

    def test_reject_non_numeric_seconds(self) -> None:
        rows = build_rows()
        rows[0]["seconds"] = "about a minute"
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("whole number", result.stderr)

    def test_reject_bad_seconds_values(self) -> None:
        for bad in ("nan", "inf", "12.5", "1e3", "0", "-4"):
            with self.subTest(seconds=bad):
                rows = build_rows()
                rows[0]["seconds"] = bad
                sheet1, sheet2 = self.write_sheets(rows)
                result = self.run_scorer(sheet1, sheet2, export=True)
                self.assertEqual(result.returncode, 2)
                self.assertIn("whole number", result.stderr)

    def test_reject_missing_and_naive_timestamp(self) -> None:
        rows = build_rows()
        rows[0]["session_started_utc"] = ""
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("session_started_utc", result.stderr)

        rows = build_rows()
        for row in rows:
            row["session_started_utc"] = row["session_started_utc"].replace("Z", "")
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("timezone", result.stderr)

    def test_reject_two_start_times_within_one_session(self) -> None:
        rows = build_rows()
        rows[1]["session_started_utc"] = "2026-11-07T10:00:00Z"
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("two different start times", result.stderr)

    def test_reject_washout_gap_under_48_hours(self) -> None:
        rows = build_rows(session_start={"1": "2026-11-07T09:00:00Z", "2": "2026-11-08T20:00:00Z"})
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("washout", result.stderr)

    def test_reject_reversed_session_order(self) -> None:
        rows = build_rows(session_start={"1": "2026-11-09T09:00:00Z", "2": "2026-11-07T09:00:00Z"})
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("swapped", result.stderr)

    def test_reject_session_in_the_wrong_sheet(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        mixed = Path(str(sheet1) + ".mixed.csv")
        mixed.write_text(sheet1.read_text() + "\n".join(sheet2.read_text().splitlines()[1:]) + "\n")
        result = self.run_scorer(mixed, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("sheet", result.stderr)

    def test_reject_missing_second_session_rows(self) -> None:
        rows = build_rows()
        sheet1, sheet2 = self.write_sheets(rows)
        sheet2.write_text(sheet2.read_text().splitlines()[0] + "\n")
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("both sessions", result.stderr)

    def test_reject_missing_question_in_session(self) -> None:
        rows = [r for r in build_rows() if not (r["scenario"] == "S1-simple-stack" and r["session"] == "1" and r["question_id"] == "Q4")]
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("missing session data", result.stderr)

    def test_reject_duplicate_rows(self) -> None:
        rows = build_rows()
        rows.append(dict(rows[0]))
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("duplicate row", result.stderr)

    def test_reject_unknown_scenario(self) -> None:
        rows = build_rows()
        rows[0]["scenario"] = "S9-does-not-exist"
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("unknown scenario", result.stderr)

    def test_reject_applicability_contradiction(self) -> None:
        rows = build_rows()
        rows[0]["applicable"] = "false"
        rows[0]["seconds"] = ""
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("contradicts the frozen key", result.stderr)

    def test_reject_empty_answer(self) -> None:
        rows = build_rows()
        rows[0]["answer"] = ""
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("empty answer", result.stderr)

    def test_reject_bad_recognition_flag(self) -> None:
        rows = build_rows()
        rows[0]["recognised_prior"] = ""
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("recognised_prior", result.stderr)

    def test_reject_multiple_readers(self) -> None:
        rows = build_rows()
        rows[-1]["reader"] = "SECOND-FAKE-READER"
        sheet1, sheet2 = self.write_sheets(rows)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("exactly one reader", result.stderr)

    def test_reject_header_mismatch(self) -> None:
        rows = build_rows()
        columns = [c for c in rows[0] if c != "seconds"]
        sheet1, sheet2 = self.write_sheets(rows, header=columns)
        result = self.run_scorer(sheet1, sheet2, export=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("header mismatch", result.stderr)

    def test_reject_unbalanced_and_same_arm_maps(self) -> None:
        mutations = []
        unbalanced = json.loads(json.dumps(self.arm_map))
        entry = unbalanced["scenarios"]["S6-sdk-ipc"]
        entry["arms"] = {"A": "baseline", "B": "candidate"}
        entry["session1"] = {"arm": "A", "role": "baseline"}
        entry["session2"] = {"arm": "B", "role": "candidate"}
        mutations.append(("unbalanced", unbalanced, "unbalanced"))
        same_arm = json.loads(json.dumps(self.arm_map))
        entry = same_arm["scenarios"]["S3-long-label-hub"]
        entry["session2"] = {"arm": "A", "role": "baseline"}
        mutations.append(("same-arm", same_arm, "same arm"))
        for name, payload, expected in mutations:
            with self.subTest(arm_map=name):
                path = self.write_raw(f"{name}-arm-map.json", json.dumps(payload))
                sheet1, sheet2 = self.write_sheets(build_rows())
                result = self.run_scorer(sheet1, sheet2, export=True, arm_map=path)
                self.assertEqual(result.returncode, 2)
                self.assertIn(expected, result.stderr)

    def test_reject_unexpected_exception_maps_to_exit_2(self) -> None:
        key = json.loads(KEY.read_text())
        key["scenarios"]["S1-simple-stack"]["questions"] = "not a mapping"
        path = self.write_raw("broken-key.json", json.dumps(key))
        sheet1, sheet2 = self.write_sheets(build_rows())
        result = self.run_scorer(sheet1, sheet2, export=True, key=path)
        self.assertEqual(result.returncode, 2)
        self.assertIn("unexpected", result.stderr)

    def test_reject_empty_templates(self) -> None:
        result = self.run_scorer(
            KIT / "response-sheet-session1.csv", KIT / "response-sheet-session2.csv", export=True
        )
        self.assertEqual(result.returncode, 2)
        self.assertIn("session_started_utc", result.stderr)


if __name__ == "__main__":
    unittest.main(verbosity=2)
