---
name: common-observability
description: Enforce structured JSON logging, OpenTelemetry distributed tracing, and RED metrics across backend services. Use when adding request correlation, setting up tracing spans, defining SLO burn-rate alerts, or instrumenting middleware.
metadata:
  triggers:
    files:
      - "**/*.service.ts"
      - "**/*.handler.ts"
      - "**/*.middleware.ts"
      - "**/*.interceptor.ts"
      - "**/*.go"
      - "**/*.java"
      - "**/*.kt"
      - "**/*.py"
    keywords:
      - logging
      - tracing
      - metrics
      - opentelemetry
      - observability
      - slo
---

# Common Observability Standards

## **Priority: P1 (HIGH)**

## Logging & Tracing

- **JSON Logs**: Always emit JSON structured logs. Never plain-text in prod.
- **Correlation**: Extract `X-Request-Id` or `traceparent`. Attach to async context.
- **Tracing**: Use OpenTelemetry. Propagate W3C `traceparent`.
- **Spans**: Name spans like `<HTTP_METHOD> <route>` (`GET /users/:id`).

See [implementation examples](references/implementation.md) for structured logger setup with Pino.

## Metrics

- **Required**: Request rate, Error rate, Latency histogram (p50/p95/p99), Saturation.
- **SLOs**: Alert on SLO burn rates, not raw threshold spikes.

## Instrumentation Workflow

1. Define the operation and route-normalized span name before adding code.
2. Propagate request/trace context across every async or service boundary.
3. Log one structured event with correlation fields; redact secrets and request bodies.
4. Add RED metrics with route-safe labels, then define an SLO and burn-rate alert.
5. Exercise a success and failure path; confirm spans close and IDs join logs to traces.

## Anti-Patterns

- **Console.log**: not use in prod; use structured logger (`pino`, `zap`).
- **PII in Logs**: Never log tokens, passwords, or full request bodies.
- **Dynamic Span Names**: `GET /users/123` causes cardinality explosion. Use `GET /users/:id`.
- **Missing Cleanup**: Always end tracing spans.

## References

- [Observability Data Formats](references/observability-formats.md)
