# Python Tooling Gates

## Good default stack

- `ruff check`
- `pyright` or `basedpyright`
- focused `pytest`
- `python -m compileall -q src tests infra`
- dependency audit such as `pip-audit`

## When to go wider

- Workflow runtime, dispatch, verifier, or control-plane changes: add smoke or integration gate.
- Requirements, CI, auth, or security changes: add dependency/security verification and fresh artifacts.
