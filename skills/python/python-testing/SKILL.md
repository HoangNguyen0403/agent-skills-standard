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

## Core Rule Anchors

- **`[BE-TEST-01]` Parametrized Tests for Equivalent Inputs**: Prefer `pytest.mark.parametrize` for equivalent inputs and boundary permutations. Distinct scenarios may stay separate.
- **`[BE-TEST-02]` Ban on Brittle SQL String Matching**: Test pure domain calculations directly or use fakes/testcontainers; do not regex-match SQL strings in mocks.
- **`[BE-TEST-03]` Ban on Shallow Assertions**: Never assert only `assert result` without inspecting domain attributes and invariants.
- **`[BE-TEST-04]` Ban on Pass-Through Seam Mocks**: Repositories and adapters must test contract compliance and error mapping; ban 1:1 pass-through mock echoing.
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a failing test reproducing the defect before fixing it.

## Rules

- Use `pytest` and `pytest-asyncio` for async boundaries.
- Add regression tests around contract parsing, workflow routing, and verifier outcomes (`[BE-TEST-05]`).
- Prefer `pytest.mark.parametrize` for equivalent inputs; distinct scenarios may stay separate (`[BE-TEST-01]`).
- Prefer fakes or monkeypatch at external seams: DB, RPC, Telegram, subprocess, Docker (`[BE-TEST-02]`, `[BE-TEST-04]`).
- Verify behavior and domain invariants, not shallow truthiness or implementation trivia (`[BE-TEST-03]`).
- Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Recipe

1. **Write the failing test first** for the boundary or regression (`[BE-TEST-05]`).
2. **Patch one seam high enough** to keep the test readable (`[BE-TEST-04]`).
3. **Assert structured outcomes**: metadata, route result, blocker text, emitted command (`[BE-TEST-03]`).
4. **Use async tests for async code**; avoid spinning real event loops manually.
5. **Cover negative paths** for malformed packets, stale runtime state, and missing env.

## Anti-Patterns

- **`[BE-TEST-01]` Stylistic parametrize rewrites**: Do not demand parameterized rewrites of passing tests without a behavioral gap.
- **`[BE-TEST-02]` SQL regex matching**: Do not regex-match SQL strings in mocks.
- **`[BE-TEST-03]` Shallow assertions**: Never assert only `assert result`; always verify domain attributes and invariants.
- **`[BE-TEST-04]` Pass-through seam mocks**: Ban 1:1 mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug fix without reproduction test**: Ban bug fixes without a reproduction test.
- **No live network or DB in unit tests**: Use fakes or testcontainers.
- **No broad monkeypatch spray**: Patch the boundary, not every helper under it.
- **No smoke-only proof for shared runtime changes**: Add focused assertions too.
## References

- [Framework Map](../references/framework-map.md)
- [Pytest Patterns](references/pytest-patterns.md)
