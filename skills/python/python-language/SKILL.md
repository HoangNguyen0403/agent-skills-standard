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

- Prefer `from __future__ import annotations` in modern modules.
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
- **No `os.path` in new code**: prefer `Path`.
- **No `Any` as escape hatch**: narrow unknown shapes or validate them.
- **No import-time env reads for volatile runtime state** unless cached config is intentional.

## Verify

- Run parser/type checks after cross-module type changes.
- Load [Framework Map](../references/framework-map.md) for category defaults.

## References

- [Framework Map](../references/framework-map.md)
