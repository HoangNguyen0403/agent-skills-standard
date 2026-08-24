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

## Router & GraphQL Selection

- **Standard Lib (`net/http`)**: Use for simple services or zero-dependency requirements. `http.ServeMux` (Go 1.22+) method-based routing.
- **Echo (`labstack/echo`) / Gin**: Recommended for production REST APIs with middleware, binding, and error handling.
- **GraphQL (`99designs/gqlgen`)**: Standard for schema-first GraphQL services. Handlers/resolvers act as thin transport adapters.

## Implementation Workflow

1. **Choose transport layer** — REST (Echo/Gin/stdlib) or GraphQL (gqlgen).
2. **Thin Handlers & Resolvers** — Handlers and resolvers parse/validate inputs, invoke use-case services, and map to transport models. Zero direct database queries or business rules.
3. **Transport-to-Domain Mapping** — Domain models remain pure; transport models adapt to domain models via dedicated mappers.
4. **Response Nullability & Slice Defaulting** — Default empty slices to `[]` (not `null`) unless the schema explicitly requires null. Avoid unnecessary `nullable` fields in GraphQL response schemas when zero-values suffice.
5. **Add middleware** — Use middleware for cross-cutting concerns (Logging, Recovery, CORS, Auth, Tracing, RequestID).
6. **Enforce pagination limits** — Support `first/after` (GraphQL cursor) or `limit/offset` (REST) with strict max caps to prevent memory exhaustion.
7. **Implement graceful shutdown** — Handle SIGINT/SIGTERM to drain in-flight requests.

See [graceful shutdown example](references/graceful-shutdown.md) and [Echo handler patterns](references/middleware-patterns.md)

## Anti-Patterns

- **No business logic in handlers or resolvers**: parse request, call service, and format response only.
- **No direct DB calls in resolvers**: resolvers must call service interfaces, never execute SQL queries.
- **No nil slices in responses**: return empty slice `[]` rather than `null` in API responses unless distinguishing null from empty.
- **No global router/schema vars**: pass router/handler dependencies explicitly via constructor.
- **No missing shutdown**: handle SIGTERM to drain in-flight requests.

## References

- [Middleware Patterns](references/middleware-patterns.md)
- [Graceful Shutdown](references/graceful-shutdown.md)