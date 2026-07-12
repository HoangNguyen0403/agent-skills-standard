Use gRPC for synchronous, low-latency request/response calls between trusted internal services with a strongly typed `.proto` contract. Use RabbitMQ (or Kafka) for asynchronous domain events and fire-and-forget work where producers should be decoupled from consumer availability.

gRPC makes the caller wait and needs service availability/timeouts; RabbitMQ adds broker operations and eventual consistency but supports buffering, retries, and multiple consumers. Keep `.proto`, DTOs, and interfaces in `libs/contracts`, version messages semantically, and never import another service's implementation directly.

