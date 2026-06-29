# Clean Architecture In Python

## Dependency rule

- Dependencies point inward.
- Domain and policy code should not import DB, HTTP, bot, queue, or subprocess clients.

## Suggested layout

```text
src/
├── domain/          # policy, contracts, value objects
├── application/     # orchestrators, use cases, workflows
├── adapters/        # db, http, bot, mcp, storage
└── bootstrap/       # runtime wiring and startup
tests/
infra/
```

## Good splits

- Parse / normalize input in one helper.
- Evaluate policy in another helper.
- Persist or emit side effects in adapters.
- Render operator-facing text outside persistence code.
