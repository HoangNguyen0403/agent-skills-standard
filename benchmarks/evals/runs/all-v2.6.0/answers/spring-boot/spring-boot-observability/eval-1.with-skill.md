Use SLF4J, typically via `@Slf4j`, and emit structured logs to stdout. In production, configure a JSON encoder such as `logstash-logback-encoder` so the platform can parse fields without scraping prose:

```java
log.info("order created orderId={} customerId={}", orderId, customerId);
```

Keep sensitive values out of logs and use stable field names. Add request and trace correlation through MDC, including fields such as trace ID, span ID, user ID, or tenant ID where appropriate. MDC is thread-local, so install propagation for async work and clients and always clear request-specific values in a `finally` block; pooled threads otherwise leak context between requests.

Log to stdout only and let the container/platform ship logs. Do not use `System.out`, concatenate unstructured messages, or log and swallow exceptions. Verify JSON shape, correlation fields, exception handling, and MDC cleanup in tests or a running service. Secure Actuator endpoints separately; observability output must not become an unauthenticated data leak.


