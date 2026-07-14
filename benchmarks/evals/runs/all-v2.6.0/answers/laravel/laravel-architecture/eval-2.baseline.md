Put business logic in an application service/action when it coordinates a use case, and in domain objects when it is an invariant or behavior of the domain. Models can contain relationship definitions, casts, scopes, and cohesive persistence-related behavior, but should not become an unbounded service layer.

For example, `CreateOrder` can validate the workflow, call an inventory/domain service, persist the aggregate in a transaction, and dispatch an event. A policy owns authorization; a form request owns input validation; a job owns asynchronous execution. Keep the HTTP controller as an adapter. Choose the simplest boundary that matches complexity rather than creating repositories and services for every one-line query.

