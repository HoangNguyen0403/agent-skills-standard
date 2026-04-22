---
name: golang-api-server
description: Build HTTP services, REST APIs, and middleware in Go. Use when building Go HTTP servers, REST APIs, or custom middleware.
metadata:
  triggers:
    files:
    - 'cmd/server/*.go'
    - 'internal/adapter/handler/**'
    keywords:
    - http server
    - rest api
    - gin
    - echo
    - middleware
---
# Golang API Server

## **Priority: P0 (CRITICAL)**

## Router Selection

- **Standard Lib (`net/http`)**: Use for simple services or zero-dependency requirements. `http.ServeMux` (Go 1.22+) method-based routing.
- **Echo (`labstack/echo`)**: Recommended for production REST APIs with middleware, binding, and error handling.
- **Gin (`gin-gonic/gin`)**: High performance alternative.

## Implementation Workflow

1. **Choose router** — Select based on complexity needs (stdlib for simple, Echo/Gin for production).
2. **Separate concerns** — Handlers parse requests, call services, and format responses. No business logic in handlers.
3. **Add middleware** — Use middleware for cross-cutting concerns (Logging, Recovery, CORS, Auth, Tracing).
4. **Include health endpoints** — Always expose `/health` and `/ready` endpoints.
5. **Enforce content types** — Require `application/json` for REST APIs.
6. **Implement graceful shutdown** — Handle SIGINT/SIGTERM to drain in-flight requests.

See [graceful shutdown example](references/graceful-shutdown.md) and [Echo handler patterns](references/middleware-patterns.md)

## Anti-Patterns

- **No business logic in handlers**: parse request, call service, and format response only.
- **No global router vars**: pass router instance via constructor or DI.
- **No missing shutdown**: handle SIGTERM to drain in-flight requests.

## References

- [Middleware Patterns](references/middleware-patterns.md)
- [Graceful Shutdown](references/graceful-shutdown.md)