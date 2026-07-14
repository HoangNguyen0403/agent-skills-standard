Measure first, then optimize the main buckets: total duration, database execution, and API overhead. A practical sequence is to switch to `FastifyAdapter`, enable compression, audit accidental request-scoped provider chains, and project only the columns each query needs.

```ts
const app = await NestFactory.create(AppModule, new FastifyAdapter());
```

Use keep-alive for upstream calls, indexes and bounded pagination for reads, and prevent N+1 queries with deliberate relations/DataLoader. For high-throughput responses, avoid unnecessary `class-transformer` work and use Fastify serialization where appropriate. Validate improvements with repeatable benchmarks rather than assuming a framework switch fixes the bottleneck.

