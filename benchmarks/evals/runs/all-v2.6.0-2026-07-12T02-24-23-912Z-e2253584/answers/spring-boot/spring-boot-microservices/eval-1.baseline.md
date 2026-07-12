# Resilience for microservice calls

Set explicit connect, response, and overall call timeouts. Use bounded client pools and bulkheads so one dependency cannot consume all threads. Add a circuit breaker to stop traffic to a failing dependency and recover gradually. Retry only transient failures with a small bounded count, exponential backoff, and jitter; never blindly retry non-idempotent operations.

Resilience4j provides Spring integrations for `CircuitBreaker`, `Retry`, `TimeLimiter`, and `Bulkhead`. Configure policies per dependency, emit metrics, and make fallbacks honest: cached data, queued work, or a clear error. Use idempotency keys where retries can repeat effects, propagate trace IDs, and test slow, timed-out, partial, and recovering dependencies.



