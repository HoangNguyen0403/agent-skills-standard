"""Shared, immutable shapes every schema parser produces."""

from __future__ import annotations

from dataclasses import dataclass


class SchemaParseError(ValueError):
    """The input is not a schema this parser understands."""


@dataclass(frozen=True)
class Column:
    name: str
    type: str
    pk: bool = False
    fk: bool = False
    nullable: bool = True


@dataclass(frozen=True)
class Entity:
    name: str
    columns: tuple
    evidence: str


@dataclass(frozen=True)
class Relation:
    source: str
    target: str
    cardinality: str
    label: str
    evidence: str


@dataclass(frozen=True)
class ParsedSchema:
    entities: tuple
    relations: tuple


def line_of(text: str, offset: int) -> int:
    return text.count("\n", 0, offset) + 1
