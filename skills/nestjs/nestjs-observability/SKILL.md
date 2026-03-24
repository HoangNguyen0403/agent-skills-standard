---
name: nestjs-observability
description: "Configure structured logging with Pino, Prometheus metrics, and health checks for NestJS services. Use when adding JSON logging, request tracing with correlation IDs, Prometheus metric endpoints, or liveness/readiness health checks. (triggers: main.ts, **/*.module.ts, nestjs-pino, Prometheus, Logger, reqId)"
---

# Observability Standards

## Priority: P1 (OPERATIONAL)

Logging, monitoring, and observability patterns for production NestJS applications.

## Structured Logging (Pino)

Use `nestjs-pino` for high-performance, async JSON logging. Node's `console.log` is blocking and unstructured.

```typescript
// app.module.ts — Pino setup with redaction
import { LoggerModule } from 'nestjs-pino';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        transport: process.env.NODE_ENV !== 'production'
          ? { target: 'pino-pretty' } : undefined,
        redact: ['req.headers.authorization', 'body.password', 'body.token'],
      },
    }),
  ],
})
export class AppModule {}
```

## Tracing (Correlation)

- **Request ID**: Every log line **must** include a `reqId`. `nestjs-pino` handles this via `AsyncLocalStorage`.
- **Propagation**: Pass `x-request-id` to downstream microservices and database queries for end-to-end tracing.

## Metrics

Expose `/metrics` for Prometheus scraping using `@willsoto/nestjs-prometheus`.

```typescript
// metrics.module.ts — key metric definitions
import { makeHistogramProvider, makeGaugeProvider } from '@willsoto/nestjs-prometheus';

const providers = [
  makeHistogramProvider({ name: 'http_request_duration_seconds', help: 'HTTP latency', labelNames: ['method', 'route', 'status'] }),
  makeHistogramProvider({ name: 'db_query_duration_seconds', help: 'DB query latency', labelNames: ['operation'] }),
  makeGaugeProvider({ name: 'memory_usage_bytes', help: 'Heap memory usage' }),
];
```

## Health Checks

- **Terminus**: Implement "Liveness" (I'm alive) vs "Readiness" (I can take traffic).
  - **DB Check**: `TypeOrmHealthIndicator` / `PrismaHealthIndicator`.
  - **Memory Check**: Fail readiness if Heap > 300MB to prevent crash loops.

## Performance Headers (Dev Only)

- `X-Response-Duration-Ms`, `X-DB-Execution-Ms`, `X-API-Overhead-Ms`
- Gate behind `ENABLE_PERFORMANCE_BENCHMARK` feature flag; never expose in production.

## Anti-Patterns

- **No console.log**: Use nestjs-pino for async, structured, JSON-formatted logging.
- **No missing reqId**: Propagate `x-request-id` header to all downstream services and queries.
- **No perf data in production by default**: Gate benchmarking behind `ENABLE_PERFORMANCE_BENCHMARK` flag.
