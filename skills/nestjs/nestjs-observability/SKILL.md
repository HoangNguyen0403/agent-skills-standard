---
name: nestjs-observability
description: "Structured logging (Pino) and Prometheus metrics. Use when adding structured logging with Pino or Prometheus metrics to NestJS services. (triggers: main.ts, **/*.module.ts, nestjs-pino, Prometheus, Logger, reqId)"
---

# Observability Standards

## **Priority: P1 (OPERATIONAL)**

Logging, monitoring, and observability patterns for production applications.

- **Standard**: Use `nestjs-pino` for high-performance JSON logging.
  - **Why**: Node's built-in `console.log` is blocking and unstructured.
- **Configuration**:
  - **Redaction**: Mandatory masking of sensitive fields (`password`, `token`, `email`).
  - **Context**: Always inject `Logger` and set the context (`LoginService`).

## Tracing (Correlation)

- **Request ID**: Every log line **must** include a `reqId` (Request ID).
  - `nestjs-pino` handles this automatically using `AsyncLocalStorage`.
  - **Propagation**: Pass `x-request-id` to downstream microservices/database queries key to trace flows.

## API Overhead & Database Benchmarking

- **Execution Bucket Strategy**: When performance profiling is enabled, utilize global interceptors combined with `AsyncLocalStorage` to split and expose latency into logical buckets.
- **Headers**: Expose the metrics via HTTP Headers on the response for immediate feedback during development or testing:
  - `X-Response-Duration-Ms` (Total execution time)
  - `X-DB-Execution-Ms` (Time spent exclusively in database queries, tracked via TypeORM loggers)
  - `X-API-Overhead-Ms` (Time spent in NestJS interceptors, guards, and serialization)
- **Security**: Only enable performance headers and detailed SQL benchmarking in development or when a specific feature flag (`ENABLE_PERFORMANCE_BENCHMARK`) is explicitly active.

## Metrics

- **Exposure**: Use `@willsoto/nestjs-prometheus` to expose `/metrics` for Prometheus scraping.
- **Key Metrics**:
  1. `http_request_duration_seconds` (Histogram)
  2. `db_query_duration_seconds` (Histogram)
  3. `memory_usage_bytes` (Gauge)

## Health Checks

- **Terminus**: Implement explicit logic for "Liveness" (I'm alive) vs "Readiness" (I can take traffic).
  - **DB Check**: `TypeOrmHealthIndicator` / `PrismaHealthIndicator`.
  - **Memory Check**: Fail if Heap > 300MB (prevent crash loops).


## Anti-Patterns

- **No console.log**: Use nestjs-pino for async, structured, JSON-formatted logging.
- **No missing reqId**: Propagate `x-request-id` header to all downstream services and queries.
- **No perf data in production by default**: Gate benchmarking behind `ENABLE_PERFORMANCE_BENCHMARK` flag.
