---
name: python-tooling
description: Configure Python tooling, dependency surfaces, static analysis, and verification gates. Use when editing `pyproject.toml`, `requirements.txt`, `pytest.ini`, `ruff`, `pyright`, CI, or Python release checks.
metadata:
  triggers:
    files:
      - "pyproject.toml"
      - "requirements.txt"
      - "pytest.ini"
      - "ruff.toml"
      - ".ruff.toml"
      - "mypy.ini"
      - "uv.lock"
      - "poetry.lock"
    keywords:
      - ruff
      - pyright
      - basedpyright
      - pip-audit
      - compileall
      - pytest.ini
---

# Python Tooling

## **Priority: P1 (HIGH)**

## Rules

- Keep one authoritative dependency surface per environment and audit every tracked requirements file.
- Prefer `ruff` for lint plus import hygiene; use `pyright` or `basedpyright` for type feedback.
- Run `pytest` plus `python -m compileall` for runtime Python changes.
- Add smoke or security gates when the change touches workflow/runtime behavior.

## Verification Workflow

1. **Lint** with `ruff check`.
2. **Type-check** with `pyright` or `basedpyright` where configured.
3. **Run focused pytest scope** for changed behavior.
4. **Run `python -m compileall -q ...`** for changed runtime trees.
5. **Run security or smoke gates** when auth, workflow runtime, or dependency surfaces change.

## Anti-Patterns

- **No untracked requirements files** outside the audit list.
- **No format-only green claim** for runtime changes.
- **No stale SBOM or audit artifacts** in release gates.
- **No local-only fix without CI parity** when changing gates.

## References

- [Framework Map](../references/framework-map.md)
- [Tooling Gates](references/tooling-gates.md)
