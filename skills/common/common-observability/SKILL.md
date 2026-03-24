---
name: common-observability
description: "Enforce structured JSON logging, OpenTelemetry distributed tracing, and RED metrics across backend services. Use when adding request correlation, setting up tracing spans, defining SLO burn-rate alerts, or instrumenting middleware. (triggers: **/*.service.ts, **/*.handler.ts, **/*.middleware.ts, **/*.interceptor.ts, **/*.go, **/*.java, **/*.kt, **/*.py, logging, tracing, metrics, opentelemetry, observability, slo)"
---

# Common Observability Standards

## **Priority: P1 (OPERATIONAL)**

## Logging & Tracing

- **JSON Logs**: Always emit JSON structured logs. Never plain-text in prod.
- **Correlation**: Extract `X-Request-Id` or `traceparent`. Attach to async context.
- **Tracing**: Use OpenTelemetry. Propagate W3C `traceparent`.
- **Spans**: Name spans like `<HTTP_METHOD> <route>` (`GET /users/:id`).

### Example: Structured Logger Setup (Node.js / Pino)

```typescript
import pino from "pino";

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  mixin() {
    return { service: "order-api" };
  },
});

// Attach correlation ID per request
app.use((req, res, next) => {
  req.log = logger.child({ traceId: req.headers["x-request-id"] });
  next();
});
```

## Metrics

- **Required**: Request rate, Error rate, Latency histogram (p50/p95/p99), Saturation.
- **SLOs**: Alert on SLO burn rates, not raw threshold spikes.

## Anti-Patterns

- **Console.log**: Do not use in prod; use a structured logger (`pino`, `zap`).
- **PII in Logs**: Never log tokens, passwords, or full request bodies.
- **Dynamic Span Names**: `GET /users/123` causes cardinality explosion. Use `GET /users/:id`.
- **Missing Cleanup**: Always end tracing spans.

## References
- [Observability Data Formats](references/observability-formats.md)
