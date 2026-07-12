A clean, practical top-level layout for a Go microservice usually looks like this:

- `cmd/`
  - Application entrypoints.
  - For a single service, often `cmd/api/` or `cmd/service/` with `main.go`.
  - Wires dependencies together and starts the app.

- `internal/`
  - Private application code that should not be imported by other modules.
  - This is usually where most of the service lives.

Inside `internal/`, a Clean Architecture split often looks like:

- `internal/domain/`
  - Core business entities, value objects, and domain rules.
  - Pure business logic with minimal external dependencies.

- `internal/usecase/` or `internal/application/`
  - Application-specific business workflows.
  - Orchestrates domain objects and ports/interfaces.
  - Contains service logic like `CreateOrder`, `ProcessPayment`, etc.

- `internal/port/` or `internal/interface/`
  - Interfaces that define how the use cases talk to the outside world.
  - Examples: repository interfaces, message publisher interfaces, external client contracts.
  - Some teams split this into:
    - `internal/port/inbound/`
    - `internal/port/outbound/`

- `internal/adapter/`
  - Concrete implementations of the ports.
  - Examples:
    - `internal/adapter/http/`
    - `internal/adapter/grpc/`
    - `internal/adapter/repository/`
    - `internal/adapter/client/`
    - `internal/adapter/messaging/`

- `internal/config/`
  - Config loading, parsing, and validation.

- `internal/platform/` or `internal/infrastructure/`
  - Shared technical concerns not belonging to business logic.
  - Examples: logging, DB setup, tracing, middleware, metrics.

Other common top-level directories:

- `pkg/`
  - Reusable public packages if you intentionally want other modules to import them.
  - If not needed, skip it.

- `api/`
  - API contracts such as OpenAPI specs, protobuf files, or generated API definitions.

- `configs/`
  - Static config files, environment examples, service config templates.

- `deployments/` or `infra/`
  - Kubernetes manifests, Helm charts, Terraform, Docker-related deployment assets.

- `scripts/`
  - Helper scripts for local development, CI, code generation, etc.

- `test/`
  - Integration tests, end-to-end tests, or test fixtures that sit outside package-level unit tests.

- `docs/`
  - Architecture notes, ADRs, API docs, runbooks.

A concise example:

```text
myservice/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── domain/
│   ├── usecase/
│   ├── port/
│   ├── adapter/
│   │   ├── http/
│   │   ├── repository/
│   │   └── client/
│   ├── config/
│   └── platform/
├── api/
├── deployments/
├── scripts/
├── test/
└── docs/
```

Rule of thumb:

- `domain` = what the business is
- `usecase` = what the system does
- `port` = boundaries/interfaces
- `adapter` = how the outside world connects
- `cmd` = how the service starts

If you want, I can also show a minimal folder structure for a real CRUD Go microservice using this layout.

