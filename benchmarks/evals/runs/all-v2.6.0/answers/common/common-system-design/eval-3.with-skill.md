Here is a quick-start example for common system design using a simple order-processing feature.

Suppose a user places an order in an e-commerce system. A clean starting design is:

- `OrderController`: accepts the HTTP request and validates the transport shape
- `PlaceOrderUseCase`: contains the business workflow
- `OrderRepository`: interface for saving orders
- `PaymentGateway`: interface for charging payment
- `InventoryService`: interface for reserving stock
- `OrderRepositoryImpl`, `StripePaymentGateway`, `InventoryHttpClient`: infrastructure implementations

The dependency flow should look like this:

`Controller -> UseCase -> Interfaces`

and the concrete infrastructure implementations point back into those interfaces:

`Database/API clients -> Interface implementations -> UseCase`

That means the use case knows nothing about SQL, Stripe SDKs, or HTTP libraries.

A simple request flow:

1. `OrderController` receives `POST /orders`
2. It maps input into a command object and calls `PlaceOrderUseCase`
3. `PlaceOrderUseCase` checks business rules
4. It reserves inventory
5. It creates the order record through `OrderRepository`
6. It emits an `OrderPlaced` event for downstream tasks such as email or analytics

This design applies several best practices immediately:

- Separation of concerns: transport, business rules, and infrastructure are isolated
- Dependency inversion: the use case depends on interfaces, not concrete SDKs
- Loose coupling: email and analytics happen asynchronously from the event
- Stateless request handling: any app instance can process the request
- Graceful degradation: if analytics is down, the order can still succeed

For distributed-system safety, make the order creation idempotent. For example, require an idempotency key on `POST /orders`. If the client retries because of a timeout, the server returns the existing result instead of creating a duplicate order.

For resilience, add:

- Timeout on calls to payment and inventory services
- Retry with backoff only for idempotent transient failures
- Circuit breaker around unstable downstream dependencies
- Separate connection/thread pools so one dependency cannot exhaust the whole service

For consistency, choose trade-offs per subdomain:

- Payment and order finalization may need stronger consistency
- Analytics and email notifications can be eventually consistent

A short ADR for this example would record:

- Bounded contexts: ordering, payments, inventory, notifications
- Pattern: clean/layered core with async events for non-critical side effects
- Dependency direction: inward toward use-case and interface layer
- CAP choice: prioritize consistency for payment state, availability for notifications
- Resilience rules: timeout, circuit breaker, idempotency key, retry budget

That is a strong quick-start because it is simple, testable, and ready to evolve without locking the whole system to one framework or one failure-prone integration.

