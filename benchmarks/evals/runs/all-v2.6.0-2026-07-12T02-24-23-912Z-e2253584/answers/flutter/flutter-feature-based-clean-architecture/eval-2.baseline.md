Orders should depend on a stable abstraction, not on the loyalty feature's presentation code or concrete data source. Define the capability orders needs in the domain layer, such as a `LoyaltyPointsRepository` or a narrower `GetLoyaltyPoints` use case, then inject an implementation at application startup.

For example, the orders use case can receive a `LoyaltyPointsReader` interface and call `getBalance(customerId)`. The loyalty feature owns the implementation that talks to its cache or API. Orders only knows the return type and failure contract it needs.

Avoid importing loyalty screens, blocs, or database classes into orders. If the two features must coordinate a workflow, use an application-level coordinator or an event/use-case boundary. This keeps the dependency directional, makes orders easy to test with a fake reader, and avoids circular feature dependencies.

