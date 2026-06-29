---
name: python-testing
description: Test Python services with pytest, async coverage, monkeypatch, and boundary-focused fakes. Use when writing Python tests, fixtures, async tests, regression tests, or dependency-isolated verification.
metadata:
  triggers:
    files:
      - "tests/**/*.py"
      - "pytest.ini"
      - "**/conftest.py"
      - "**/test_*.py"
      - "**/*_test.py"
    keywords:
      - pytest
      - monkeypatch
      - fixture
      - async test
      - regression test
---

# Python Testing

## **Priority: P0 (CRITICAL)**

## Rules

- Use `pytest` and `pytest-asyncio` for async boundaries.
- Add regression tests around contract parsing, workflow routing, and verifier outcomes.
- Prefer fakes or monkeypatch at external seams: DB, RPC, Telegram, subprocess, Docker.
- Verify behavior, not implementation trivia.

## Recipe

1. **Write the failing test first** for the boundary or regression.
2. **Patch one seam high enough** to keep the test readable.
3. **Assert structured outcomes**: metadata, route result, blocker text, emitted command.
4. **Use async tests for async code**; avoid spinning real event loops manually.
5. **Cover negative paths** for malformed packets, stale runtime state, and missing env.

## Anti-Patterns

- **No live network or DB in unit tests**.
- **No broad monkeypatch spray**: patch the boundary, not every helper under it.
- **No smoke-only proof for shared runtime changes**: add focused assertions too.
- **No unverified refactor** of orchestration code without regression coverage.

## References

- [Framework Map](../references/framework-map.md)
- [Pytest Patterns](references/pytest-patterns.md)
