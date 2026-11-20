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

Universal anti-slop rules (identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps, shallow
assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Python deltas
follow.

## Stack Deltas

- **Framework**: `pytest` with `pytest-asyncio` for async boundaries; fixtures live in `conftest.py`.
- **Isolation (`[BE-TEST-04]`)**: fake or `monkeypatch` at external seams — DB, RPC, subprocess, Docker; patch one seam
  high enough to keep the test readable; no broad monkeypatch spray.
- **Parametrize (`[BE-TEST-01]`)**: `pytest.mark.parametrize` for equivalent inputs and boundaries; distinct scenarios may
  stay separate.
- **Assertions (`[BE-TEST-03]`)**: assert structured outcomes — metadata, route result, blocker text, emitted command —
  not shallow truthiness or implementation trivia.
- **Regression (`[BE-TEST-05]`)**: cover contract parsing, workflow routing, and verifier outcomes.
- **Coverage**: diagnostic and project-configured; verify risk-weighted critical paths.

## Recipe

1. Write the failing test first for the boundary or regression.
2. Patch one seam high enough to keep the test readable.
3. Assert structured outcomes.
4. Use async tests for async code; do not spin real event loops manually.
5. Cover negative paths for malformed packets, stale runtime state, and missing env.

## Anti-Patterns

- **No live network or DB in unit tests**: use fakes or testcontainers.
- **No broad monkeypatch spray**: patch the boundary, not every helper under it.
- **No smoke-only proof for shared runtime changes**: add focused assertions.

## References

- [Framework Map](../references/framework-map.md)
- [Pytest Patterns](references/pytest-patterns.md)
