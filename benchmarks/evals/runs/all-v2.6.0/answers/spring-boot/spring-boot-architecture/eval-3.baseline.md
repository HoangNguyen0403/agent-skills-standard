# Business logic placement

Controllers should handle transport concerns: bind and validate input, authorize the request, call an application service, and map the result to an HTTP response. Put business rules, orchestration, transactions, and invariants in application/domain services or use-case classes.

For example, a controller can call `placeOrderService.place(command)`; the service loads aggregates, enforces rules, persists changes, and publishes events. Keep domain code independent of HTTP so the same use case works from messaging or jobs. Small normalization and response mapping are fine in controllers, but pricing, persistence, and multi-step decisions do not belong there.



