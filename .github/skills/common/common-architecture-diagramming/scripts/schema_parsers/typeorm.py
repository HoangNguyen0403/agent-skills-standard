"""TypeORM entity parser: @Entity classes, column decorators, relation decorators.

@OneToMany is the inverse side and emits nothing; @ManyToMany counts only on the side
that carries @JoinTable. A @ManyToOne / @OneToOne adds a synthetic `<prop>Id` FK column.
"""

from __future__ import annotations

import re

from .model import Column, Entity, ParsedSchema, Relation, SchemaParseError, line_of

_ENTITY = re.compile(r"@Entity\(\s*(?:'([^']*)'|\"([^\"]*)\")?\s*[^)]*\)\s*(?:export\s+)?class\s+(\w+)"
                     r"[^{]*\{(.*?)^\}", re.MULTILINE | re.DOTALL)
# Matches only the property declaration itself; the preceding decorator text is sliced out
# by _members() below with plain string ops. A single group repeated with an internal lazy
# quantifier (the previous ((?:@\w+\([^;]*?\)\s*)+) shape) is a classic ReDoS: on unclosed
# input the engine tries exponentially many ways to split the text among repetitions.
_PROPERTY = re.compile(r"(\w+)\s*[?!]?:\s*([\w\[\]<>| ]+);")
_RELATION = re.compile(r"@(ManyToOne|OneToOne|ManyToMany|OneToMany)\(\s*\(\)\s*=>\s*(\w+)")
_CARD = {"ManyToOne": "many-to-one", "OneToOne": "one-to-one", "ManyToMany": "many-to-many"}


def _members(body):
    """Yield (decorators, prop, ptype, prop_start) for each property in a class body.

    `decorators` is the raw text since the previous property (or the class start), found by
    slicing rather than matching, so it carries no regex risk regardless of its content.
    """
    prev_end = 0
    for prop_match in _PROPERTY.finditer(body):
        yield (body[prev_end:prop_match.start()], prop_match.group(1),
               prop_match.group(2).strip(), prop_match.start())
        prev_end = prop_match.end()


def _parse_entity(text, path, match, class_to_table):
    table = class_to_table[match.group(3)]
    body, body_offset = match.group(4), match.start(4)
    columns, relations = [], []
    for decorators, prop, ptype, prop_start in _members(body):
        evidence = "%s:%d" % (path, line_of(text, body_offset + prop_start))
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
