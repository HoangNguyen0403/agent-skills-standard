For synchronous Spring Boot service calls, use Spring Cloud OpenFeign or Spring 6 HTTP Interfaces and wrap the call with Resilience4j. The minimum resilience policy should include a circuit breaker, bounded retries with exponential backoff, and a rate limiter. Set connect/read/request timeouts as well; retries without a timeout can amplify an outage.

```java
@FeignClient(name = "inventory", fallbackFactory = InventoryFallback.class)
interface InventoryClient {
    @GetMapping("/api/v1/items/{id}")
    ItemAvailability get(@PathVariable UUID id);
}
```

Configure a circuit breaker around the client, retry only transient and idempotent failures, and use jittered exponential backoff with a finite attempt count. A fallback should return a safe degraded result or an explicit failure; never silently invent business data. Rate-limit expensive or overloaded dependencies. Propagate tracing context through the client.

For repeated or long-running work, prefer an event with Spring Cloud Stream, a durable broker, a DLQ, and an idempotent consumer. Keep one database per service and share DTO records or API contracts, not entities or databases. Verify failure behavior with tests that exercise timeout, open-circuit, retry-exhausted, rate-limited, and recovery states.


