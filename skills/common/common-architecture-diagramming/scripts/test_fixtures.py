#!/usr/bin/env python3
"""Golden-file tests: every diagram type and every schema parser has a pinned output.

Regenerate after an intentional renderer change:
    UPDATE_GOLDEN=1 python3 -m unittest test_fixtures
"""

import glob
import json
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import check_layout
import render_drawio
import schema_to_spec
import validate_spec
from schema_parsers import PARSERS, detect_format

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(os.path.dirname(HERE), "fixtures")
UPDATE = os.environ.get("UPDATE_GOLDEN") == "1"


def _read(path):
    with open(path, encoding="utf-8") as handle:
        return handle.read()


def _golden(path, actual):
    if UPDATE or not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(actual)
    return _read(path)


class TestGoldenDiagrams(unittest.TestCase):
    def test_every_type_has_a_fixture(self):
        names = {os.path.basename(p)[:-len(".spec.json")]
                 for p in glob.glob(os.path.join(FIX, "*.spec.json"))}
        self.assertEqual(names, set(render_drawio.DIAGRAM_TYPES))

    def test_fixtures_validate_render_and_match_golden(self):
        for path in sorted(glob.glob(os.path.join(FIX, "*.spec.json"))):
            with self.subTest(fixture=os.path.basename(path)):
                spec = json.loads(_read(path))
                self.assertEqual(validate_spec.validate(spec), [])
                self.assertEqual(validate_spec.collect_warnings(spec), [])
                self.assertEqual(check_layout.check(spec, render_drawio.layout(spec)), [])
                actual = render_drawio.render(spec) + "\n"
                self.assertEqual(actual, _golden(path[:-len(".spec.json")] + ".drawio", actual))


class TestGoldenSchemas(unittest.TestCase):
    def test_schema_fixtures_match_expected(self):
        for path in sorted(glob.glob(os.path.join(FIX, "schemas", "orders*"))):
            if path.endswith(".expected.json"):
                continue
            with self.subTest(schema=os.path.basename(path)):
                text = _read(path)
                rel = os.path.relpath(path, os.path.dirname(FIX))
                schema = PARSERS[detect_format(path, text)](text, rel)
                spec = schema_to_spec.build_spec([schema], "Golden", "golden", "2026-09-13")
                actual = json.dumps(spec, indent=2, ensure_ascii=False, sort_keys=True) + "\n"
                self.assertEqual(actual, _golden(path + ".expected.json", actual))


if __name__ == "__main__":
    unittest.main()
