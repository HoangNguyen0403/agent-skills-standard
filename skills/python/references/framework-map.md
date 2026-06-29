# Python Framework Map

Reviewed: 2026-06-29

Official sources:

- https://docs.python.org/3/tutorial/
- https://docs.python.org/3/library/
- https://peps.python.org/pep-0008/

## Default stance

- `python-language`: typing, dataclasses, imports, stdlib-first idioms.
- `python-architecture`: dependency direction, service boundaries, ports/adapters.
- `python-testing`: pytest, async tests, fakes, regression coverage.
- `python-tooling`: `ruff`, `pyright`/`basedpyright`, `pytest`, `compileall`, dependency audit.
- `python-async-runtime`: blocking I/O boundaries, cancellation, timeouts, background tasks.
- `python-database`: parameterized SQL, transactions, connection scope, repository seams.
- `python-error-handling`: narrow exceptions, rollback, contextual logging, re-raise.
- `python-security`: secret handling, subprocess/path safety, dependency and injection controls.

## Layout defaults

- `src/` for app code, `tests/` for pytest suites, `infra/` for operator scripts and smoke gates.
- Keep domain helpers pure when possible; keep transport, DB, and env reads at boundaries.
- Use dataclasses, typed dicts, or pydantic models to make contracts explicit.

## Runtime defaults

- Prefer async-native clients in async paths; use `asyncio.to_thread` only around blocking libraries.
- Treat direct DB reads, traces, and smoke checks as stronger truth than route-only status text.
- Verify behavior with focused pytest, `python -m compileall`, and smoke/security gates when runtime flows change.

## Smells that mean "load more skills"

- `except Exception` swallows outcome or blocker truth.
- `async def` calls blocking DB, subprocess, or HTTP code directly.
- Long orchestration/report functions mix parsing, persistence, transport, and formatting.
- SQL, env access, and retry logic are duplicated across business modules.
