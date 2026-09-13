"""CREATE TABLE parser: enough DDL to draw an ERD, nothing more.

Understands: column lines with an inline PRIMARY KEY / NOT NULL / REFERENCES t(c);
table-level PRIMARY KEY (...) and FOREIGN KEY (...) REFERENCES t (c). Ignores indexes,
constraints it does not recognise, and everything outside CREATE TABLE.
"""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_TABLE = re.compile(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`\"]?(\w+)[`\"]?\s*\((.*?)\)\s*;",
                    re.IGNORECASE | re.DOTALL)
_INLINE_REF = re.compile(r"REFERENCES\s+[`\"]?(\w+)[`\"]?\s*\(", re.IGNORECASE)
_TABLE_PK = re.compile(r"PRIMARY\s+KEY\s*\(([^)]*)\)", re.IGNORECASE)
_TABLE_FK = re.compile(r"FOREIGN\s+KEY\s*\(([^)]*)\)\s*REFERENCES\s+[`\"]?(\w+)[`\"]?", re.IGNORECASE)
_CONSTRAINT_START = re.compile(r"^\s*(CONSTRAINT|PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|INDEX|KEY)\b",
                               re.IGNORECASE)


def _split_top_level(body: str):
    parts, depth, current = [], 0, []
    for ch in body:
        if ch == "(":
            depth += 1
        elif ch == ")":
            depth -= 1
        if ch == "," and depth == 0:
            parts.append("".join(current))
            current = []
        else:
            current.append(ch)
    if "".join(current).strip():
        parts.append("".join(current))
    return parts


def _names(csv: str):
    return {n.strip(' `"') for n in csv.split(",")}


def _parse_table(text, path, match):
    table, body = match.group(1), match.group(2)
    columns, relations, pk_names, fk_names = [], [], set(), set()
    cursor = match.start(2)
    for raw in _split_top_level(body):
        raw_offset = text.find(raw, cursor)
        cursor = raw_offset + len(raw)
        piece_offset = raw_offset + (len(raw) - len(raw.lstrip()))
        piece = raw.strip()
        if not piece:
            continue
        evidence = "%s:%d" % (path, line_of(text, piece_offset))
        if _CONSTRAINT_START.match(piece):
            pk = _TABLE_PK.search(piece)
            if pk:
                pk_names |= _names(pk.group(1))
            fk = _TABLE_FK.search(piece)
            if fk:
                fk_names |= _names(fk.group(1))
                relations.append(Relation(table, fk.group(2), "many-to-one", "", evidence))
            continue
        tokens = piece.split()
        name = tokens[0].strip('`"')
        ctype = tokens[1].rstrip(",") if len(tokens) > 1 else "?"
        upper = piece.upper()
        ref = _INLINE_REF.search(piece)
        if ref:
            relations.append(Relation(table, ref.group(1), "many-to-one", "", evidence))
        columns.append(Column(name, ctype, pk="PRIMARY KEY" in upper, fk=ref is not None,
                              nullable="NOT NULL" not in upper and "PRIMARY KEY" not in upper))
    columns = tuple(
        Column(c.name, c.type, c.pk or c.name in pk_names, c.fk or c.name in fk_names,
               c.nullable and c.name not in pk_names) for c in columns)
    return Entity(table, columns, "%s:%d" % (path, line_of(text, match.start()))), relations


def parse(text: str, path: str) -> ParsedSchema:
    entities, relations = [], []
    for match in _TABLE.finditer(text):
        entity, rels = _parse_table(text, path, match)
        entities.append(entity)
        relations += rels
    if not entities:
        raise SchemaParseError("%s: no CREATE TABLE statement found" % path)
    return ParsedSchema(tuple(entities), tuple(relations))
