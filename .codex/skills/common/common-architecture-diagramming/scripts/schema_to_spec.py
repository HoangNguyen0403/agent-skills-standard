#!/usr/bin/env python3
"""Turn schema files into an `erd` diagram spec for render_drawio.py.

Usage:
    python3 schema_to_spec.py db/schema.sql prisma/schema.prisma --title "Orders — ERD" \\
        --scope "Order and customer tables" -o docs/architecture/orders-erd.spec.json

Supported inputs: SQL DDL (.sql), Prisma (.prisma), TypeORM entities (.ts with @Entity),
Django models / SQLAlchemy declarative classes (.py). Anything else is refused. A table that
is referenced but never declared becomes an entity with no evidence, so it renders UNVERIFIED.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import re
import sys

from schema_parsers import PARSERS, detect_format
from schema_parsers.model import SchemaParseError


class MergeError(ValueError):
    """Two input files declare the same entity."""


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", name.lower()).strip("_")


def parse_files(paths):
    schemas = []
    for path in paths:
        with open(path, encoding="utf-8") as handle:
            text = handle.read()
        schemas.append(PARSERS[detect_format(path, text)](text, path))
    return schemas


def _column(column):
    out = {"name": column.name, "type": column.type}
    if column.pk:
        out["pk"] = True
    if column.fk:
        out["fk"] = True
    if not column.nullable:
        out["nullable"] = False
    return out


def _entity_nodes(schemas):
    nodes, seen = [], {}
    for schema in schemas:
        for entity in schema.entities:
            node_id = slug(entity.name)
            if node_id in seen:
                raise MergeError("entity %s declared twice (%s and %s)"
                                 % (entity.name, seen[node_id], entity.evidence))
            seen[node_id] = entity.evidence
            nodes.append({"id": node_id, "label": entity.name, "kind": "entity",
                          "evidence": entity.evidence,
                          "columns": [_column(c) for c in entity.columns]})
    return nodes, seen


def _relation_edges(schemas, nodes, seen):
    edges = []
    for schema in schemas:
        for relation in schema.relations:
            src, dst = slug(relation.source), slug(relation.target)
            if dst not in seen:
                seen[dst] = None
                nodes.append({"id": dst, "label": relation.target, "kind": "entity",
                              "columns": [{"name": "?", "type": "?"}]})
            edge = {"from": src, "to": dst, "cardinality": relation.cardinality,
                    "evidence": relation.evidence}
            if relation.label:
                edge["label"] = relation.label
            edges.append(edge)
    return edges


def build_spec(schemas, title, scope, date, author=""):
    nodes, seen = _entity_nodes(schemas)
    edges = _relation_edges(schemas, nodes, seen)
    for items in (nodes, edges):
        for item in items:
            if item.get("evidence"):
                item.update(evidence_kind="code", evidence_confidence="documented")
    return {"title": title, "type": "erd", "audience": "tech", "version": "1.0", "date": date,
            "author": author, "scope": scope, "nodes": nodes, "edges": edges}


def main(argv=None):
    parser = argparse.ArgumentParser(description="Build an erd spec from schema files.")
    parser.add_argument("files", nargs="+")
    parser.add_argument("--title", required=True)
    parser.add_argument("--scope", default="Tables and their relationships.")
    parser.add_argument("--author", default="")
    parser.add_argument("--date", default=dt.date.today().isoformat())
    parser.add_argument("-o", "--output")
    args = parser.parse_args(argv)
    try:
        spec = build_spec(parse_files(args.files), args.title, args.scope, args.date, args.author)
    except (SchemaParseError, MergeError, OSError) as error:
        sys.stderr.write("%s\n" % error)
        return 1
    text = json.dumps(spec, indent=2, ensure_ascii=False) + "\n"
    if args.output:
        with open(args.output, "w", encoding="utf-8") as handle:
            handle.write(text)
    else:
        sys.stdout.write(text)
    sys.stderr.write("%d entities, %d relations%s\n" % (
        len(spec["nodes"]), len(spec["edges"]), (" -> " + args.output) if args.output else ""))
    return 0


if __name__ == "__main__":
    sys.exit(main())
