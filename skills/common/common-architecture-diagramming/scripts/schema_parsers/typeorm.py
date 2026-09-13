"""TypeORM entity parser: @Entity classes, column decorators, relation decorators.

@OneToMany is the inverse side and emits nothing; @ManyToMany counts only on the side
that carries @JoinTable. A @ManyToOne / @OneToOne adds a synthetic `<prop>Id` FK column.
"""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_ENTITY = re.compile(r"@Entity\(\s*(?:'([^']*)'|\"([^\"]*)\")?\s*[^)]*\)\s*(?:export\s+)?class\s+(\w+)"
                     r"[^{]*\{(.*?)^\}", re.MULTILINE | re.DOTALL)
_MEMBER = re.compile(r"((?:@\w+\([^;]*?\)\s*)+)(\w+)\s*[?!]?:\s*([\w\[\]<>| ]+);", re.DOTALL)
_RELATION = re.compile(r"@(ManyToOne|OneToOne|ManyToMany|OneToMany)\(\s*\(\)\s*=>\s*(\w+)")
_CARD = {"ManyToOne": "many-to-one", "OneToOne": "one-to-one", "ManyToMany": "many-to-many"}


def _parse_entity(text, path, match, class_to_table):
    table = class_to_table[match.group(3)]
    body, body_offset = match.group(4), match.start(4)
    columns, relations = [], []
    for member in _MEMBER.finditer(body):
        decorators, prop, ptype = member.group(1), member.group(2), member.group(3).strip()
        evidence = "%s:%d" % (path, line_of(text, body_offset + member.start()))
        nullable = "nullable: true" in decorators
        rel = _RELATION.search(decorators)
        if rel:
            kind, target_class = rel.groups()
            if kind == "OneToMany" or (kind == "ManyToMany" and "@JoinTable" not in decorators):
                continue
            target = class_to_table.get(target_class, target_class)
            relations.append(Relation(table, target, _CARD[kind], prop, evidence))
            if kind in ("ManyToOne", "OneToOne"):
                columns.append(Column(prop + "Id", "fk", fk=True, nullable=nullable))
            continue
        if "@Column" not in decorators and "@Primary" not in decorators:
            continue
        is_pk = "@Primary" in decorators
        columns.append(Column(prop, ptype, pk=is_pk, nullable=(not is_pk) and nullable))
    entity = Entity(table, tuple(columns), "%s:%d" % (path, line_of(text, match.start())))
    return entity, relations


def parse(text: str, path: str) -> ParsedSchema:
    matches = list(_ENTITY.finditer(text))
    if not matches:
        raise SchemaParseError("%s: no @Entity classes found" % path)
    class_to_table = {m.group(3): (m.group(1) or m.group(2) or m.group(3)) for m in matches}
    entities, relations = [], []
    for match in matches:
        entity, rels = _parse_entity(text, path, match, class_to_table)
        entities.append(entity)
        relations += rels
    return ParsedSchema(tuple(entities), tuple(relations))
