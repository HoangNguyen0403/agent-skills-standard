# Resilience Patterns: Circuit Breaker, Retry, Bulkhead

## Circuit Breaker

Prevents cascading failures by stopping requests to a failing dependency.

### States

```bash
CLOSED ──[failures exceed threshold]──► OPEN ──[timeout elapsed]──► HALF-OPEN
  ▲                                                                      │
  └──────────────[probe request succeeds]────────────────────────────────┘
```

- **CLOSED**: Normal operation. Track failure count.
- **OPEN**: Fast-fail all requests. Return cached response or error immediately. No calls to dependency.
- **HALF-OPEN**: Allow limited probe requests. If success → CLOSED. If fail → OPEN again.

### Configuration Guidelines

| Parameter                    | Recommended Default           |
| ---------------------------- | ----------------------------- |
| Failure threshold (%)        | 50% of requests in 10s window |
| Minimum requests to evaluate | 20                            |
| Open → Half-Open timeout     | 30 seconds                    |
| Half-Open probe limit        | 5 requests                    |

### Libraries

| Language        | Library                       |
| --------------- | ----------------------------- |
| TypeScript/Node | `opossum`                     |
| Go              | `sony/gobreaker`              |
| Java            | Resilience4j `CircuitBreaker` |
| Kotlin          | Resilience4j                  |
| Python          | `pybreaker`                   |

## Retry Pattern

Automatically reattempt transient failures with backoff.

### Rules

1. **Only retry idempotent operations** — retrying a `POST /payment` double-charges.
2. **Exponential backoff** with jitter: `delay = base * 2^attempt + random(0, base)`
3. **Max retries**: 3 attempts is standard. Never infinite retry loops.
4. **Retry budget**: Track retry rate. If > 10% of requests are retries, underlying system is failing — alert instead.

```typescript
// Exponential backoff with jitter
async function withRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = Math.min(
        100 * Math.pow(2, attempt) + Math.random() * 100,
        3000,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('unreachable');
}
```

### Retryable vs Non-Retryable Errors

| Error Type              | Retry?                                   |
| ----------------------- | ---------------------------------------- |
| Network timeout         | ✅ Yes                                   |
| 429 Too Many Requests   | ✅ Yes (respect `Retry-After`)           |
| 503 Service Unavailable | ✅ Yes                                   |
| 400 Bad Request         | ❌ No (client bug — retrying won't help) |
| 401 Unauthorized        | ❌ No                                    |
| 500 (non-idempotent)    | ❌ No (risk of double-processing)        |

## Bulkhead Pattern

Isolate resources into pools to prevent one consumer from exhausting all capacity.

- Each downstream dependency gets its own **connection pool** and **thread pool**.
- A spike in requests to Service A does not starve requests to Service B.
- Set pool size based on expected load + SLA. Monitor pool exhaustion via metrics.

```bash
┌─────────────────────────────────────────────────┐
│                 API Gateway                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Pool: DB │  │Pool: ML  │  │Pool: S3  │      │
│  │ (size:20)│  │(size: 5) │  │(size:10) │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```
