# NestJS controller architecture audit

The key question is whether controllers translate transport concerns into an application operation, or whether they have become the place where business decisions are made. A healthy controller normally does only the following:

- declares the route and transport-level metadata;
- authenticates and authorizes through guards or a clearly defined policy boundary;
- validates and transforms input through DTOs and pipes;
- calls one application service or use case;
- maps the result to an HTTP response and lets framework exception handling deal with failures.

Typical signs of logic creeping into controllers include direct repository or ORM calls, calls to several unrelated external clients, transactions started and committed in route methods, loops over domain entities, pricing or permission rules, duplicated status/error mapping, and large `if`/`switch` trees for business states. A controller that constructs domain objects, mutates them, and decides which side effects to perform is usually carrying application logic that should be elsewhere.

I would audit every controller method for lines of code, branching, injected dependencies, and calls outside the application layer. The most useful dependency check is whether a controller depends on infrastructure details such as a database model, HTTP client, queue producer, or filesystem adapter. A small number of transport-specific collaborators is reasonable; a controller that injects many repositories and integration clients is a strong candidate for extraction. Static complexity metrics are signals, not absolute failure thresholds.

The target structure is commonly:

`Controller -> application service/use case -> domain services and entities -> repository/integration ports -> infrastructure adapters`

The controller should pass a validated command or query to the use case. The use case should coordinate the workflow, while domain services/entities own business invariants. Repositories and third-party clients should be hidden behind interfaces or ports where that abstraction provides a real boundary. HTTP-specific concerns such as status codes, headers, and DTO serialization should remain at the controller or presentation boundary.

For each flagged method, first characterize the behavior and add characterization tests at the API or use-case boundary. Then extract the workflow into a focused application service, moving business rules into named domain operations where appropriate. Keep the controller as a thin adapter and preserve error semantics during the migration. Avoid creating a service per line or hiding logic behind a generic “utils” module; the extraction should improve ownership and testability.

The audit is complete when each controller has an explicit responsibility, business rules are testable without booting the HTTP layer, infrastructure dependencies do not leak into route handlers without a reason, and tests cover validation, authorization, success mapping, and important failure paths. The result should be judged by dependency direction and behavior ownership, not merely by controller line count.

