"""Prisma schema parser: models, scalar fields, @id, @relation, optional and list fields.

Relation fields (`customer Customer @relation(...)`) are not columns; the scalar fields
they name in `fields: [...]` are marked as foreign keys. Unknown scalar or enum types stay
as columns, the type string is still informative.
"""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_MODEL = re.compile(r"^model\s+(\w+)\s*\{(.*?)^\}", re.MULTILINE | re.DOTALL)
_FIELD = re.compile(r"^\s*(\w+)\s+(\w+)(\[\])?(\?)?\s*(.*)$")
_RELATION = re.compile(r"@relation\([^)]*fields:\s*\[([^\]]*)\]", re.IGNORECASE)


def _parse_model(text, path, name, match, models, list_fields):
    body_offset = match.start(2)
    columns, relations, fk_fields = [], [], set()
    for line_match in re.finditer(r"^.*$", match.group(2), re.MULTILINE):
        line = line_match.group(0)
        field = _FIELD.match(line)
        if not field or line.strip().startswith(("//", "@@")):
            continue
        fname, ftype, is_list, optional, attrs = field.groups()
        attrs = attrs or ""
        evidence = "%s:%d" % (path, line_of(text, body_offset + line_match.start()))
        rel = _RELATION.search(attrs)
        if rel:
            fk_fields.update(f.strip() for f in rel.group(1).split(","))
            relations.append(Relation(name, ftype, "many-to-one", fname, evidence))
            continue
        if ftype in models:
            if is_list:
                list_fields.setdefault(name, set()).add(ftype)
            continue
        columns.append(Column(fname, ftype + ("[]" if is_list else ""),
                              pk="@id" in attrs, nullable=bool(optional)))
    columns = tuple(Column(c.name, c.type, c.pk, c.name in fk_fields, c.nullable and not c.pk)
                    for c in columns)
    return Entity(name, columns, "%s:%d" % (path, line_of(text, match.start()))), relations


def parse(text: str, path: str) -> ParsedSchema:
    models = {m.group(1): m for m in _MODEL.finditer(text)}
    if not models:
        raise SchemaParseError("%s: no model blocks found" % path)
    entities, relations, list_fields = [], [], {}
    for name, match in models.items():
        entity, rels = _parse_model(text, path, name, match, models, list_fields)
        entities.append(entity)
        relations += rels
    for a in sorted(list_fields):                     # implicit many-to-many: both sides list
        for b in sorted(list_fields[a]):
            if a < b and a in list_fields.get(b, set()):
                relations.append(Relation(a, b, "many-to-many", "",
                                          "%s:%d" % (path, line_of(text, models[a].start()))))
    return ParsedSchema(tuple(entities), tuple(relations))
