A practical Clean Architecture layout for a Go microservice is:

- `cmd/<service>/`
  - App entrypoint only.
  - Parse config, build logger/DB/HTTP server, wire dependencies, start the app.
  - Keep business logic out of `main.go`.

- `internal/`
  - Private application code for this service.
  - Organize by domain or capability, not by generic layer buckets.
  - Example:
    - `internal/orders/`
      - Entities, use cases, service orchestration, domain interfaces owned by callers.
    - `internal/customers/`
    - `internal/billing/`

- `internal/<domain>/transport/` or `internal/http/`
  - Delivery layer: HTTP handlers, request/response DTOs, routing, middleware.
  - Should call business use cases, not contain business rules.

- `internal/<domain>/storage/` or `internal/repository/`
  - Persistence adapters: SQL, Redis, external APIs.
  - Implements interfaces needed by use cases.
  - Accept `context.Context` on I/O paths.

- `internal/platform/` or narrower infrastructure packages
  - Shared infra with clear ownership, like:
    - `internal/platform/config`
    - `internal/platform/logging`
    - `internal/platform/database`
  - Use sparingly; avoid turning this into a dumping ground.

- `pkg/` (optional)
  - Only for code intentionally reusable by other modules/services.
  - If it is not a stable public package, keep it in `internal/`.

- `api/` (optional)
  - OpenAPI specs, protobuf files, generated contract definitions.

- `configs/` (optional)
  - Static config templates or example env files.

- `scripts/` (optional)
  - Dev and ops scripts: local bootstrap, codegen, release helpers.

- `test/` (optional)
  - Black-box integration or end-to-end tests if you want them outside package-local `_test.go` files.

Good rule of thumb:

- `cmd/` = startup and wiring
- `internal/<domain>/` = business capability
- transport/storage = adapters around the domain
- `pkg/` = truly reusable public code only

Example:

```text
myservice/
├── cmd/myservice/
│   └── main.go
├── internal/
│   ├── orders/
│   │   ├── entity.go
│   │   ├── service.go
│   │   ├── ports.go
│   │   ├── transport/http/
│   │   │   └── handler.go
│   │   └── storage/postgres/
│   │       └── repository.go
│   └── platform/
│       ├── config/
│       ├── database/
│       └── logging/
├── api/
├── configs/
├── scripts/
└── go.mod
```

The key is to keep dependencies explicit: wire concrete implementations in `cmd/<service>/main.go`, keep interfaces small and near the consumers, and avoid global singletons or generic `shared/utils` package sprawl.

