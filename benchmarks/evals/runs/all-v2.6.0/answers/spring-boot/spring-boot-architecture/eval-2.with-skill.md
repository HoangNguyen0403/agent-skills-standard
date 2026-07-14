Circular dependencies usually mean two components own responsibilities that are too tightly coupled. First map the dependency graph and move shared business rules into a third service or domain component. Keep the intended direction explicit: controllers/adapters depend on services, and services do not depend on controllers.

For a collaboration that is naturally asynchronous, replace the direct call with an event. For example, `OrderService` can publish `OrderPlaced`; notification handling consumes it without `OrderService` importing `NotificationService`. For synchronous behavior, introduce a narrow interface owned by the inner layer and have the outer adapter implement it, rather than making services call controllers or concrete infrastructure classes.

Use constructor injection with final dependencies so cycles fail at startup and are visible in the design. Avoid hiding them with `@Lazy`, service locators, `ApplicationContext.getBean()`, or field injection; those defer the design problem and make unit testing harder. Split god classes and keep repositories limited to persistence. Verify the resulting graph, transaction boundaries, and event idempotency, and use DTOs/records at API boundaries instead of entities.


