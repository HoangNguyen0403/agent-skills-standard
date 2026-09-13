#!/usr/bin/env python3
"""Tests for the schema_parsers package: one class per input format."""

import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from schema_parsers import PARSERS, detect_format
from schema_parsers import sql_ddl
from schema_parsers.model import SchemaParseError

FIX = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "fixtures", "schemas")


def read(name):
    with open(os.path.join(FIX, name), encoding="utf-8") as handle:
        return handle.read()


class TestSqlDdl(unittest.TestCase):
    def setUp(self):
        self.schema = sql_ddl.parse(read("orders.sql"), "fixtures/schemas/orders.sql")
        self.by_name = {e.name: e for e in self.schema.entities}

    def test_three_tables_found_with_declaration_lines(self):
        self.assertEqual(sorted(self.by_name), ["customers", "order_items", "orders"])
        self.assertEqual(self.by_name["customers"].evidence, "fixtures/schemas/orders.sql:1")
        self.assertEqual(self.by_name["orders"].evidence, "fixtures/schemas/orders.sql:7")

    def test_inline_primary_key_and_not_null(self):
        cols = {c.name: c for c in self.by_name["customers"].columns}
        self.assertTrue(cols["id"].pk)
        self.assertFalse(cols["email"].nullable)
        self.assertTrue(cols["name"].nullable)
        self.assertEqual(cols["email"].type, "text")

    def test_inline_references_marks_fk_and_relation(self):
        cols = {c.name: c for c in self.by_name["orders"].columns}
        self.assertTrue(cols["customer_id"].fk)
        rel = [r for r in self.schema.relations if r.source == "orders"][0]
        self.assertEqual((rel.target, rel.cardinality), ("customers", "many-to-one"))
        self.assertEqual(rel.evidence, "fixtures/schemas/orders.sql:9")

    def test_table_level_primary_and_foreign_keys(self):
        cols = {c.name: c for c in self.by_name["order_items"].columns}
        self.assertTrue(cols["order_id"].pk and cols["sku"].pk)
        self.assertTrue(cols["order_id"].fk)
        self.assertNotIn("PRIMARY", cols)
        rel = [r for r in self.schema.relations if r.source == "order_items"][0]
        self.assertEqual(rel.target, "orders")

    def test_text_without_create_table_is_an_error(self):
        with self.assertRaises(SchemaParseError):
            sql_ddl.parse("SELECT 1;", "x.sql")


class TestDetect(unittest.TestCase):
    def test_extension_and_content_sniffing(self):
        self.assertEqual(detect_format("a.sql", ""), "sql")
        self.assertEqual(detect_format("schema.prisma", ""), "prisma")
        self.assertEqual(detect_format("user.entity.ts", "@Entity()\nclass User {}"), "typeorm")
        self.assertEqual(detect_format("models.py", "class A(models.Model): pass"), "django_sqlalchemy")
        self.assertEqual(detect_format("models.py", "Base = declarative_base()"), "django_sqlalchemy")

    def test_unknown_format_names_the_supported_ones(self):
        with self.assertRaises(SchemaParseError) as ctx:
            detect_format("readme.md", "# hi")
        self.assertIn("prisma", str(ctx.exception))

    def test_registry_has_all_four_parsers(self):
        self.assertEqual(set(PARSERS), {"sql", "prisma", "typeorm", "django_sqlalchemy"})


if __name__ == "__main__":
    unittest.main()
