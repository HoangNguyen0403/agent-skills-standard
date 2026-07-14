# Communication between microservices

Use synchronous REST or gRPC when the caller needs an immediate response. Use Kafka, RabbitMQ, or another broker for asynchronous work, buffering, fan-out, and loose coupling. Define contracts with OpenAPI, protobuf, or event schemas; version them compatibly and validate consumer expectations.

For synchronous calls, use typed clients such as Spring `RestClient`, WebClient, or HTTP interfaces, plus TLS, authentication, timeouts, bounded pools, and safe retries/circuit breakers. For messaging, use durable delivery, consumer groups, schema evolution, idempotent consumers, backoff, and dead-letter handling. Prefer local transactions with an outbox and eventual consistency over distributed transactions. Each service should own its data; do not share databases as an API.



