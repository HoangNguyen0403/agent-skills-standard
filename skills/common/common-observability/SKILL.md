---
name: common-observability
description: Enforce structured JSON logging, OpenTelemetry distributed tracing, and RED metrics across backend services. Use when adding request correlation, setting up tracing spans, defining SLO burn-rate alerts, or instrumenting middleware.
metadata:
  triggers:
    files:
    - '**/*.service.ts'
    - '**/*.handler.ts'
    - '**/*.middleware.ts'
    - '**/*.interceptor.ts'
    - '**/*.go'
    - '**/*.java'
    - '**/*.kt'
    - '**/*.py'
    keywords:
    - logging
    - tracing
    - metrics
    - opentelemetry
    - observability
    - slo
---
# Common Observability Standards

## **Priority: P1 (OPERATIONAL)**

## Logging & Tracing

- **JSON Logs**: Always emit JSON structured logs. Never plain-text in prod.
- **Correlation**: Extract `X-Request-Id` or `traceparent`. Attach to async context.
- **Tracing**: Use OpenTelemetry. Propagate W3C `traceparent`.
- **Spans**: Name spans like `<HTTP_METHOD> <route>` (`GET /users/:id`).

See [implementation examples](references/implementation.md) for structured logger setup with Pino.

## Metrics

- **Required**: Request rate, Error rate, Latency histogram (p50/p95/p99), Saturation.
- **SLOs**: Alert on SLO burn rates, not raw threshold spikes.

## Anti-Patterns

- **Console.log**: not use in prod; use structured logger (`pino`, `zap`).
- **PII in Logs**: Never log tokens, passwords, or full request bodies.
- **Dynamic Span Names**: `GET /users/123` causes cardinality explosion. Use `GET /users/:id`.
- **Missing Cleanup**: Always end tracing spans.

## References
- [Observability Data Formats](references/observability-formats.md)