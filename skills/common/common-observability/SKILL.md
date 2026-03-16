---
name: common-observability
description: "Standards for structured logging, distributed tracing, and metrics across all backend services. Use when adding logs, setting up tracing, or implementing service observability. (triggers: **/*.service.ts, **/*.handler.ts, **/*.middleware.ts, **/*.interceptor.ts, **/*.go, **/*.java, **/*.kt, **/*.py, logging, tracing, metrics, opentelemetry, observability, correlation, structured log, slo)"
keywords:
  - logging
  - tracing
  - metrics
  - opentelemetry
  - observability
  - correlation
  - structured log
  - slo
files:
  - "**/*.service.ts"
  - "**/*.handler.ts"
  - "**/*.middleware.ts"
  - "**/*.interceptor.ts"
  - "**/*.go"
  - "**/*.java"
  - "**/*.kt"
  - "**/*.py"
---

# Common Observability Standards

## **Priority: P1 (OPERATIONAL)**

Structured logging, distributed tracing, and metrics are non-negotiable for production-grade services. Absent observability = blind operations.

## 📋 Structured Logging

- **Format**: Always emit JSON logs. Never plain-text in production.
- **Required Fields** (every log line must include):
  - `timestamp` — ISO 8601 UTC (`2026-03-02T10:00:00.000Z`)
  - `level` — `error | warn | info | debug`
  - `service` — service name (e.g., `user-service`)
  - `traceId` — propagated from incoming request (W3C `traceparent`)
  - `spanId` — current span
  - `message` — human-readable summary
- **No PII in Logs**: Mask email, phone, passwords, tokens before logging.
- **No Sensitive Data**: Never log request bodies containing credentials.

## 🔗 Distributed Tracing (OpenTelemetry)

- **Standard**: Use OpenTelemetry SDK. Avoid vendor-locked tracing libraries.
- **Context Propagation**: Propagate W3C `traceparent`/`tracestate` headers across all HTTP and gRPC calls.
- **Sampling**: Use parent-based sampling in production. Capture 100% of errors regardless of sample rate.
- **Span Naming**: `<HTTP_METHOD> <route_pattern>` (e.g., `GET /users/:id`). Never include dynamic IDs in span names.
- **Span Attributes**: Add `db.statement` (parameterized), `http.status_code`, `error.type` to relevant spans.
- **Inject/Extract**: Always inject context into outgoing requests; extract from incoming.

## 📊 Metrics & SLOs

- **Naming Convention**: `<service>_<noun>_<unit>` (e.g., `api_request_duration_ms`, `db_query_errors_total`).
- **Mandatory Metrics** per service:
  - Request rate (`_requests_total`)
  - Error rate (`_errors_total`)
  - Latency histogram (`_duration_ms` — p50, p95, p99)
  - Saturation (CPU/memory utilization)
- **SLO Definitions**: Define before launch. Minimum:
  - Availability: ≥ 99.9% over 30-day window
  - Latency: p95 < 500ms, p99 < 1000ms
- **Alerting**: Alert on SLO burn rates, not raw thresholds.

## 🆔 Correlation IDs

- **Inbound**: Extract `X-Request-Id` (or `traceparent`) from request headers. Generate UUID v4 if absent.
- **Outbound**: Propagate as `X-Request-Id` header to all downstream calls.
- **Store**: Attach to async context (AsyncLocalStorage in Node, context.Context in Go) — never pass as function arguments through every layer.
- **Log**: Include in every log line for end-to-end trace reconstruction.

## Anti-Patterns

- **No `console.log`** in production: Use structured logger (`pino`, `zap`, `log/slog`).
- **No Sensitive Data**: Never log tokens, passwords, or full request bodies.
- **No Dynamic Span Names**: `GET /users/12345` → creates cardinality explosion. Use `GET /users/:id`.
- **No Missing Cleanup**: Always end spans. Use try/finally or automatic instrumentation.
- **No Silent Failures**: If tracing setup fails, log a warning and continue — don't crash.

## References

- [OpenTelemetry Specification](https://opentelemetry.io/docs/)
- [W3C Trace Context](https://www.w3.org/TR/trace-context/)
- [Google SRE Book — SLOs](https://sre.google/sre-book/service-level-objectives/)
