"""Schema file parsers feeding schema_to_spec.py. Each exposes parse(text, path)."""

from __future__ import annotations

import importlib
import re

from .model import SchemaParseError

SUPPORTED = ("sql", "prisma", "typeorm", "django_sqlalchemy")
_MODULES = {"sql": "sql_ddl", "prisma": "prisma", "typeorm": "typeorm",
            "django_sqlalchemy": "django_sqlalchemy"}


def detect_format(path: str, text: str) -> str:
    lower = path.lower()
    if lower.endswith(".sql"):
        return "sql"
    if lower.endswith(".prisma"):
        return "prisma"
    if lower.endswith(".ts") and re.search(r"@Entity\s*\(", text):
        return "typeorm"
    if lower.endswith(".py") and re.search(r"models\.Model|declarative_base|DeclarativeBase", text):
        return "django_sqlalchemy"
    raise SchemaParseError("%s: not a supported schema file (supported: %s)"
                           % (path, ", ".join(SUPPORTED)))


def _registry():
    parsers = {}
    for name, module in _MODULES.items():
        try:
            parsers[name] = importlib.import_module("%s.%s" % (__name__, module)).parse
        except ImportError:
            continue
    return parsers


PARSERS = _registry()
