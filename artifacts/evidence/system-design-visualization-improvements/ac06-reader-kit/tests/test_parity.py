#!/usr/bin/env python3
"""Self-test for arm_parity_check.py.

Covers the normaliser defect fixed after the second review: a literal '<' in a
label must survive as text, and the two arms' different escaping of the same
label must normalise to the same string.

Run: python3 -m unittest tests.test_parity -v
"""

from __future__ import annotations

import contextlib
import io
import json
import sys
import tempfile
import unittest
from pathlib import Path

KIT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(KIT))

import arm_parity_check  # noqa: E402


class NormaliseTest(unittest.TestCase):
    def test_literal_less_than_is_kept(self) -> None:
        self.assertEqual(
            arm_parity_check.normalise("p99 < 15ms · measured"),
            "p99 < 15ms · measured",
        )

    def test_escaped_and_raw_forms_converge(self) -> None:
        raw_baseline = "Global Gateway p99 < 15ms · measured"
        raw_candidate = "Global Gateway p99 &amp;lt; 15ms · measured"
        self.assertEqual(
            arm_parity_check.normalise(raw_baseline),
            arm_parity_check.normalise(raw_candidate),
        )

    def test_break_markup_and_entities(self) -> None:
        self.assertEqual(
            arm_parity_check.normalise("Reads and writes session /&lt;br&gt;SQL"),
            "Reads and writes session / SQL",
        )
        self.assertEqual(arm_parity_check.normalise("Reads and writes session /<br>SQL"),
                         "Reads and writes session / SQL")
        self.assertEqual(arm_parity_check.normalise("A &amp; B"), "A & B")

    def test_markup_is_removed(self) -> None:
        self.assertEqual(
            arm_parity_check.normalise('<b>Storefront</b><br><font style="font-size:9px">[Next.js]</font>'),
            "Storefront [Next.js]",
        )


class CompareTest(unittest.TestCase):
    def test_detects_a_label_difference(self) -> None:
        differences = arm_parity_check.compare({"a": "one"}, {"a": "two"})
        self.assertEqual(differences, [{"cell_id": "a", "baseline": "one", "candidate": "two"}])

    def test_detects_an_id_difference(self) -> None:
        differences = arm_parity_check.compare({"a": "", "b": ""}, {"a": ""})
        self.assertEqual([d["cell_id"] for d in differences], ["b"])


class KitParityTest(unittest.TestCase):
    def test_delivered_kit_is_parity_clean(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "parity-report.json"
            with contextlib.redirect_stdout(io.StringIO()):
                code = arm_parity_check.main(["--out", str(out)])
            self.assertEqual(code, 0)
            report = json.loads(out.read_text())
            self.assertEqual(report["summary"], {"scenarios": 6, "identical": 6, "differing": 0, "all_identical": True})
            for entry in report["scenarios"].values():
                self.assertTrue(entry["ids_identical"])
                self.assertEqual(entry["differences"], [])


if __name__ == "__main__":
    unittest.main(verbosity=2)
