#!/usr/bin/env python3
"""Tests for schema_to_spec: schema files in, erd spec out."""

import json
import os
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import schema_to_spec
import validate_spec
from schema_parsers.model import Column, Entity, ParsedSchema, Relation

HERE = os.path.dirname(os.path.abspath(__file__))
FIX = os.path.join(os.path.dirname(HERE), "assets", "fixtures", "schemas")


class TestBuildSpec(unittest.TestCase):
    def test_sql_fixture_becomes_valid_erd_spec(self):
        spec = schema_to_spec.build_spec(
            schema_to_spec.parse_files([os.path.join(FIX, "orders.sql")]),
            title="Orders — ERD", scope="Order tables", date="2026-09-13")
        self.assertEqual(validate_spec.validate(spec), [])
        self.assertEqual(spec["type"], "erd")
        self.assertEqual({n["id"] for n in spec["nodes"]}, {"customers", "orders", "order_items"})
        rel = [e for e in spec["edges"] if e["from"] == "orders"][0]
        self.assertEqual((rel["to"], rel["cardinality"]), ("customers", "many-to-one"))
        self.assertTrue(all(n.get("evidence") for n in spec["nodes"]))

    def test_undeclared_target_becomes_unverified_entity(self):
        schema = ParsedSchema(
            (Entity("invoices", (Column("id", "int", pk=True), Column("order_id", "int", fk=True)),
                    "m.py:3"),),
            (Relation("invoices", "orders", "many-to-one", "", "m.py:5"),))
        spec = schema_to_spec.build_spec([schema], "T", "S", "2026-09-13")
        ghost = [n for n in spec["nodes"] if n["id"] == "orders"][0]
        self.assertNotIn("evidence", ghost)
        self.assertEqual(validate_spec.validate(spec), [])

    def test_duplicate_entity_across_files_is_an_error(self):
        a = ParsedSchema((Entity("t", (Column("id", "int", pk=True),), "a.sql:1"),), ())
        with self.assertRaises(schema_to_spec.MergeError):
            schema_to_spec.build_spec([a, a], "T", "S", "2026-09-13")

    def test_ids_are_slugged(self):
        self.assertEqual(schema_to_spec.slug("Order Items"), "order_items")


class TestCli(unittest.TestCase):
    def test_cli_writes_spec_and_reports_counts(self):
        out = os.path.join(tempfile.mkdtemp(), "erd.spec.json")
        proc = subprocess.run(
            [sys.executable, os.path.join(HERE, "schema_to_spec.py"),
             os.path.join(FIX, "orders.prisma"), "--title", "Orders", "--scope", "s", "-o", out],
            capture_output=True, text=True)
        self.assertEqual(proc.returncode, 0, proc.stderr)
        self.assertIn("3 entities", proc.stderr)
        with open(out, encoding="utf-8") as handle:
            self.assertEqual(validate_spec.validate(json.load(handle)), [])

    def test_cli_rejects_unknown_file(self):
        proc = subprocess.run(
            [sys.executable, os.path.join(HERE, "schema_to_spec.py"), __file__, "--title", "x"],
            capture_output=True, text=True)
        self.assertEqual(proc.returncode, 1)
        self.assertIn("supported", proc.stderr)


if __name__ == "__main__":
    unittest.main()
