---
name: golang-api-server
description: "Build HTTP services, REST APIs, and middleware in Go. Use when building Go HTTP servers, REST APIs, or custom middleware. (triggers: cmd/server/*.go, internal/adapter/handler/**, http server, rest api, gin, echo, middleware)"
---

# Golang API Server

## **Priority: P0 (CRITICAL)**

## Router Selection

- **Standard Lib (`net/http`)**: Use for simple services or zero-dependency requirements. `http.ServeMux` (Go 1.22+) has method-based routing.
- **Echo (`labstack/echo`)**: Recommended for production REST APIs with middleware, binding, and error handling.
- **Gin (`gin-gonic/gin`)**: High performance alternative.

## Implementation Workflow

1. **Choose router** — Select based on complexity needs (stdlib for simple, Echo/Gin for production).
2. **Separate concerns** — Handlers parse requests, call services, and format responses. No business logic in handlers.
3. **Add middleware** — Use middleware for cross-cutting concerns (Logging, Recovery, CORS, Auth, Tracing).
4. **Include health endpoints** — Always expose `/health` and `/ready` endpoints.
5. **Enforce content types** — Require `application/json` for REST APIs.
6. **Implement graceful shutdown** — Handle SIGINT/SIGTERM to drain in-flight requests.

### Graceful Shutdown Example

```go
srv := &http.Server{Addr: ":8080", Handler: router}

go func() {
    if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
        log.Fatalf("listen: %s\n", err)
    }
}()

quit := make(chan os.Signal, 1)
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit

ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
if err := srv.Shutdown(ctx); err != nil {
    log.Fatal("Server forced to shutdown:", err)
}
```

### Echo Handler Pattern

```go
func (h *OrderHandler) GetOrder(c echo.Context) error {
    id := c.Param("id")
    order, err := h.orderService.GetByID(c.Request().Context(), id)
    if err != nil {
        return echo.NewHTTPError(http.StatusNotFound, "order not found")
    }
    return c.JSON(http.StatusOK, toOrderResponse(order))
}
```

## Anti-Patterns

- ❌ Business logic in handlers — parse request, call service, format response only
- ❌ Global router variables — pass router instance via constructor or DI
- ❌ Missing graceful shutdown — always handle SIGTERM to drain in-flight requests

## References

- [Middleware Patterns](references/middleware-patterns.md)
- [Graceful Shutdown](references/graceful-shutdown.md)
