---
name: nestjs-performance
description: Optimize NestJS throughput with Fastify adapter, singleton scope enforcement, compression, and query projections. Use when switching to Fastify, diagnosing request-scoped bottlenecks, or profiling API overhead.
metadata:
  triggers:
    files:
    - 'main.ts'
    keywords:
    - FastifyAdapter
    - compression
    - SINGLETON
    - REQUEST scope
---
# Performance Tuning

## **Priority: P1 (OPERATIONAL)**


## Workflow: Performance Audit

1. **Switch to Fastify** — Replace Express with `FastifyAdapter` for ~2x throughput.
2. **Enable compression** — Add Gzip/Brotli middleware.
3. **Audit provider scopes** — Ensure no unintended `REQUEST` scope chains.
4. **Add query projections** — Use `select: []` on all repository queries.
5. **Profile overhead** — Benchmark Total Duration, DB Execution, and API Overhead.

## Fastify + Compression Setup

See [implementation examples](references/example.md)

- **Keep-Alive**: Configure `http.Agent` keep-alive settings to reuse TCP connections for upstream services.

## Scope & Dependency Injection

- **Default Scope**: Adhere to `SINGLETON` scope (default).
- **Request Scope**: AVOID `REQUEST` scope unless absolutely necessary.
 - **Pro Tip**: single request-scoped service makes its entire injection chain request-scoped.
 - **Solution**: Use **Durable Providers** (`durable: true`) for multi-tenancy.
- **Lazy Loading**: Use `LazyModuleLoader` for heavyweight modules (e.g., Admin panels).

## Caching Strategy

- **Application Cache**: Use `@nestjs/cache-manager` for computation results.
 - **Deep Dive**: See **[Caching & Redis](../nestjs-caching/SKILL.md)** for L1/L2 strategies and Invalidation patterns.
- **HTTP Cache**: Set `Cache-Control` headers for client-side caching (CDN/Browser).
- **Distributed**: In microservices, use Redis store, not memory store.

## Queues & Async Processing

- **Offloading**: Never block HTTP request for long-running tasks (Emails, Reports, webhooks).
- **Tool**: Use `@nestjs/bull` (BullMQ) or RabbitMQ (`@nestjs/microservices`).
 - **Pattern**: Producer (Controller) -> Queue -> Consumer (Processor).

## Serialization

- **Warning**: `class-transformer` CPU expensive.
- **Optimization**: For high-throughput READ endpoints, consider manual mapping or using `fast-json-stringify` (built-in fastify serialization) instead of interceptors.

## Database Tuning

- **Projections**: Always use `select: []` to fetch only needed columns.
- **N+1**: Prevent N+1 queries by using `relations` carefully or `DataLoader` for Graph/Field resolvers.
- **Connection Pooling**: Configure pool size (e.g., `pool: { min: 2, max: 10 }`) in config to match DB limits.

## Profiling & Scaling

- **API Overhead vs DB Execution**: Use "Execution Bucket" strategy to continuously benchmark `Total Duration`, `DB Execution Time`, and `API Overhead`.
 - **Total Baseline**: Excellent (< 50ms), Acceptable (< 200ms), Poor (> 500ms). _Exception: Authentication routes (e.g. bcrypt/argon2) should take 300-500ms intentionally._
 - **DB Execution Baseline**: Excellent (< 5ms), Acceptable (< 30ms), Poor (> 100ms - implies missing index or N+1 problem).
 - **API Overhead Baseline**: Excellent (< 20ms), Poor (> 100ms - implies heavy synchronous processing or serialization blocking Node's event loop).
- **Offloading**: Move CPU-heavy tasks (Image processing, Crypto) to `worker_threads`.
- **Clustering**: For non-containerized environments, use `ClusterModule` to utilize all CPU cores. In K8s, prefer ReplicaSets.


## Anti-Patterns

- **No REQUEST scope without evaluation**: One REQUEST-scoped provider makes entire chain request-scoped.
- **No CPU tasks in HTTP handler**: Offload image/crypto work to `worker_threads` or BullMQ.
- **No unprojected queries**: Always `select: []` needed columns to avoid serializing unused data.