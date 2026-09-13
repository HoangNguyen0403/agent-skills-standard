"""Django models and SQLAlchemy declarative classes, by regex, without importing either.

Django: a model with no `primary_key=True` field gets Django's implicit `id` AutoField.
SQLAlchemy: `__tablename__` names the entity; `ForeignKey('t.c')` yields a many-to-one.
"""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_CLASS = re.compile(r"^class\s+(\w+)\((.*?)\):\s*\n((?:[ \t]+.*\n|[ \t]*\n)*)", re.MULTILINE)
_DJANGO_FIELD = re.compile(r"^\s+(\w+)\s*=\s*models\.(\w+)\((.*)\)\s*$", re.MULTILINE)
_TARGET = re.compile(r"^\s*(?:'([\w.]+)'|\"([\w.]+)\"|(\w+))")
_SA_COLUMN = re.compile(r"^\s+(\w+)(?:\s*:\s*Mapped\[[^\]]*\])?\s*=\s*(?:Column|mapped_column)\((.*)\)\s*$",
                        re.MULTILINE)
_SA_FK = re.compile(r"ForeignKey\(\s*['\"](\w+)\.\w+['\"]")
_TABLENAME = re.compile(r"__tablename__\s*=\s*['\"](\w+)['\"]")
_DJANGO_REL = {"ForeignKey": "many-to-one", "OneToOneField": "one-to-one",
               "ManyToManyField": "many-to-many"}


def parse(text: str, path: str) -> ParsedSchema:
    entities, relations = [], []
    for match in _CLASS.finditer(text):
        name, bases, body = match.groups()
        line = line_of(text, match.start())
        body_offset = match.start(3)
        if "models.Model" in bases:
            entity, rels = _django(name, body, body_offset, text, path, line)
        elif "Base" in bases or "DeclarativeBase" in bases:
            entity, rels = _sqlalchemy(name, body, body_offset, text, path, line)
        else:
            continue
        entities.append(entity)
        relations += rels
    if not entities:
        raise SchemaParseError("%s: no Django models or SQLAlchemy declarative classes found" % path)
    return ParsedSchema(tuple(entities), tuple(relations))


def _django(name, body, body_offset, text, path, line):
    columns, relations, has_pk = [], [], False
    for field in _DJANGO_FIELD.finditer(body):
        fname, ftype, args = field.groups()
        evidence = "%s:%d" % (path, line_of(text, body_offset + field.start()))
        nullable = "null=True" in args
        if ftype in _DJANGO_REL:
            target = _TARGET.match(args)
            target_name = next(g for g in target.groups() if g).split(".")[-1]
            relations.append(Relation(name, target_name, _DJANGO_REL[ftype], fname, evidence))
            if ftype != "ManyToManyField":
                columns.append(Column(fname + "_id", "fk", fk=True, nullable=nullable))
            continue
        pk = "primary_key=True" in args
        has_pk = has_pk or pk
        columns.append(Column(fname, ftype, pk=pk, nullable=(not pk) and nullable))
    if not has_pk:
        columns.insert(0, Column("id", "AutoField", pk=True, nullable=False))
    return Entity(name, tuple(columns), "%s:%d" % (path, line)), relations


def _sqlalchemy(name, body, body_offset, text, path, line):
    table = _TABLENAME.search(body)
    table_name = table.group(1) if table else name
    columns, relations = [], []
    for col in _SA_COLUMN.finditer(body):
        cname, args = col.groups()
        evidence = "%s:%d" % (path, line_of(text, body_offset + col.start()))
        fk = _SA_FK.search(args)
        if fk:
            relations.append(Relation(table_name, fk.group(1), "many-to-one", cname, evidence))
        pk = "primary_key=True" in args
        first = args.split(",")[0].strip()
        ctype = "?" if first.startswith("ForeignKey") or "=" in first else first
        columns.append(Column(cname, ctype, pk=pk, fk=fk is not None,
                              nullable=(not pk) and "nullable=False" not in args))
    return Entity(table_name, tuple(columns), "%s:%d" % (path, line)), relations
