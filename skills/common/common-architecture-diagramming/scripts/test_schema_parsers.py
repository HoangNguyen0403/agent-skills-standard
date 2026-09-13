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


class TestPrisma(unittest.TestCase):
    def setUp(self):
        from schema_parsers import prisma
        self.schema = prisma.parse(read("orders.prisma"), "fixtures/schemas/orders.prisma")
        self.by_name = {e.name: e for e in self.schema.entities}

    def test_models_and_scalar_columns(self):
        self.assertEqual(sorted(self.by_name), ["Customer", "Order", "Tag"])
        cols = {c.name: c for c in self.by_name["Order"].columns}
        self.assertEqual(sorted(cols), ["customerId", "id", "placedAt", "status"])
        self.assertTrue(cols["id"].pk)
        self.assertTrue(cols["customerId"].fk)
        self.assertFalse(cols["status"].nullable)

    def test_optional_field_is_nullable(self):
        cols = {c.name: c for c in self.by_name["Customer"].columns}
        self.assertTrue(cols["name"].nullable)
        self.assertFalse(cols["email"].nullable)

    def test_relation_from_owning_side(self):
        rels = {(r.source, r.target): r for r in self.schema.relations}
        self.assertEqual(rels[("Order", "Customer")].cardinality, "many-to-one")
        self.assertEqual(rels[("Order", "Customer")].evidence, "fixtures/schemas/orders.prisma:12")

    def test_implicit_many_to_many_emitted_once(self):
        m2m = [r for r in self.schema.relations if r.cardinality == "many-to-many"]
        self.assertEqual(len(m2m), 1)
        self.assertEqual((m2m[0].source, m2m[0].target), ("Customer", "Tag"))

    def test_model_evidence_is_declaration_line(self):
        self.assertEqual(self.by_name["Order"].evidence, "fixtures/schemas/orders.prisma:9")

    def test_no_models_is_an_error(self):
        from schema_parsers import prisma
        with self.assertRaises(SchemaParseError):
            prisma.parse('datasource db { provider = "postgresql" }', "s.prisma")


class TestTypeOrm(unittest.TestCase):
    def setUp(self):
        from schema_parsers import typeorm
        self.schema = typeorm.parse(read("orders.entity.ts"), "fixtures/schemas/orders.entity.ts")
        self.by_name = {e.name: e for e in self.schema.entities}

    def test_entity_names_prefer_decorator_argument(self):
        self.assertEqual(sorted(self.by_name), ["Order", "Tag", "customers"])

    def test_columns_types_and_nullability(self):
        cols = {c.name: c for c in self.by_name["customers"].columns}
        self.assertTrue(cols["id"].pk)
        self.assertEqual(cols["email"].type, "string")
        self.assertTrue(cols["name"].nullable)
        self.assertFalse(cols["email"].nullable)
        self.assertNotIn("orders", cols)

    def test_many_to_one_adds_fk_column_and_relation(self):
        cols = {c.name: c for c in self.by_name["Order"].columns}
        self.assertTrue(cols["customerId"].fk)
        rel = [r for r in self.schema.relations if r.source == "Order"][0]
        self.assertEqual((rel.target, rel.cardinality), ("customers", "many-to-one"))

    def test_many_to_many_with_join_table(self):
        m2m = [r for r in self.schema.relations if r.cardinality == "many-to-many"]
        self.assertEqual([(r.source, r.target) for r in m2m], [("customers", "Tag")])

    def test_no_entities_is_an_error(self):
        from schema_parsers import typeorm
        with self.assertRaises(SchemaParseError):
            typeorm.parse("export class Nope {}", "n.ts")


class TestDjangoSqlAlchemy(unittest.TestCase):
    def setUp(self):
        from schema_parsers import django_sqlalchemy as ds
        self.schema = ds.parse(read("orders_models.py"), "fixtures/schemas/orders_models.py")
        self.by_name = {e.name: e for e in self.schema.entities}

    def test_django_models_get_implicit_id_pk(self):
        cols = {c.name: c for c in self.by_name["Customer"].columns}
        self.assertTrue(cols["id"].pk)
        self.assertEqual(cols["id"].type, "AutoField")
        self.assertTrue(cols["name"].nullable)
        self.assertFalse(cols["email"].nullable)

    def test_explicit_primary_key_suppresses_implicit_id(self):
        cols = {c.name: c for c in self.by_name["Tag"].columns}
        self.assertTrue(cols["label"].pk)
        self.assertNotIn("id", cols)

    def test_foreign_key_and_many_to_many(self):
        cols = {c.name: c for c in self.by_name["Order"].columns}
        self.assertTrue(cols["customer_id"].fk)
        rels = {(r.source, r.target): r.cardinality for r in self.schema.relations}
        self.assertEqual(rels[("Order", "Customer")], "many-to-one")
        self.assertEqual(rels[("Order", "Tag")], "many-to-many")

    def test_sqlalchemy_table_uses_tablename_and_foreign_key(self):
        cols = {c.name: c for c in self.by_name["invoices"].columns}
        self.assertTrue(cols["id"].pk)
        self.assertTrue(cols["order_id"].fk)
        self.assertFalse(cols["order_id"].nullable)
        self.assertTrue(cols["total"].nullable)
        rels = {(r.source, r.target): r.cardinality for r in self.schema.relations}
        self.assertEqual(rels[("invoices", "orders")], "many-to-one")

    def test_no_models_is_an_error(self):
        from schema_parsers import django_sqlalchemy as ds
        with self.assertRaises(SchemaParseError):
            ds.parse("x = 1", "m.py")


if __name__ == "__main__":
    unittest.main()
