Use synchronous REST calls when the caller needs an immediate response, through Spring Cloud OpenFeign or Spring 6 HTTP Interfaces. Keep the contract in versioned DTO records or a dedicated API contract module, add timeouts and Resilience4j circuit breaker/retry/rate-limiter policies, and propagate Micrometer tracing context.

Use asynchronous messaging when work can be decoupled or retried independently. Spring Cloud Stream lets handlers be declared as `Consumer`, `Function`, or `Supplier`; serialize events as JSON or Avro, use a durable broker, and configure a dead-letter queue. Consumers must be idempotent because delivery can be repeated. Include an event ID and enough metadata for deduplication and observability.

Give each service its own database. Services communicate through APIs or events, never shared tables; share DTOs/clients rather than JPA entities. Avoid long synchronous call chains that create a distributed monolith. Choose the interaction per business boundary, document ownership and failure semantics, and test timeouts, duplicate events, DLQ handling, and contract compatibility.


