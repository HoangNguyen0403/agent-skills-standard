---
name: python-language
description: Core Python 3.11+ language standards for typing, dataclasses, imports, pathlib, and stdlib-first code. Use for idiomatic language constructs in Python modules or stubs; defer pytest fixtures, database/client configuration, subprocess security, and other specialized concerns.
metadata:
  triggers:
    files:
      - "**/*.py"
      - "**/*.pyi"
      - "pyproject.toml"
    keywords:
      - python
      - dataclass
      - typing
      - pathlib
      - protocol
      - typeddict
---

# Python Language

## **Priority: P0 (CRITICAL)**

## Rules

- Choose annotation evaluation from the project's target version and its consumers: prefer deferred annotations when the project targets 3.14+ and its consumers allow it (deferred by default there, PEP 649); on 3.11–3.13 add `from __future__ import annotations` only when forward references must stay unevaluated. Do not add or remove the future import where runtime annotation consumers (`pydantic`, dataclasses, `get_type_hints`, `annotationlib`) depend on the current eager/stringized behavior — check them first.
- Pass `encoding=` on every text file boundary (`open`, `Path.read_text`, `Path.write_text`), normally `encoding="utf-8"`. Do not rely on the platform default: 3.15 switched the default to UTF-8 while 3.11–3.14 remain locale-dependent.
- Type public functions, return values, and boundary data shapes.
- Use `pathlib.Path`, `contextlib`, `enum`, and stdlib helpers before custom wrappers.
- Use `@dataclass(frozen=True)` for immutable contracts and value objects.
- Prefer `Protocol`, `TypedDict`, or small dataclasses over `dict[str, Any]` sprawl.

## Recipe

1. **Model contracts explicitly** with dataclasses, typed dicts, or pydantic at I/O boundaries.
2. **Keep imports stable**: stdlib, third-party, local.
3. **Use comprehensions and generators carefully**; stop when readability drops.
4. **Choose explicit timezone-aware datetimes** for persisted or user-visible timestamps.
5. **Keep module side effects minimal**; import should not start work.

## Anti-Patterns

- **No mutable defaults**: use `field(default_factory=...)`.
- **No locale-dependent text I/O**: omitting `encoding` at a file or stream boundary makes behavior version- and host-dependent.
- **No `os.path` in new code**: prefer `Path`.
- **No `Any` as escape hatch**: narrow unknown shapes or validate them.
- **No import-time env reads for volatile runtime state** unless cached config is intentional.

## Verify

- Run parser/type checks after cross-module type changes.
- Load [Framework Map](../references/framework-map.md) for category defaults.

## References

- [Framework Map](../references/framework-map.md)
