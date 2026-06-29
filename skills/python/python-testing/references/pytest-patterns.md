# Pytest Patterns

## Default stack

- `pytest`
- `pytest-asyncio` for async tests
- `monkeypatch` for env, RPC, client, and clock seams

## Good targets

- Route/result parsers
- Metadata patch helpers
- Admission and verifier decisions
- Docker/subprocess cleanup helpers
- Report rendering and stale-state classification

## Prefer

- Small fake classes over deep mock chains
- `monkeypatch.setattr` at module seams
- Assertions on structured fields, not only raw strings
