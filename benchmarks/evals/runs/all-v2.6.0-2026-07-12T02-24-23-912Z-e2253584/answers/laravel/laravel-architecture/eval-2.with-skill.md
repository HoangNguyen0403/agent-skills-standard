Put business logic in a focused Action class or domain/service layer, not in the controller. The controller should receive a validated request, call one use case, and translate its result into an HTTP response.

For example, `CreateOrder::handle(CreateOrderData $data)` can enforce order rules and coordinate repositories. The controller injects that Action and passes `$request->validated()` or a typed DTO. If the use case needs persistence abstraction, inject a repository interface and bind its Eloquent implementation in `AppServiceProvider`.

This keeps controllers free of Eloquent queries, branching business rules, and manual dependency construction. Split large services by use case rather than creating a God Service. Use Form Requests for authorization and validation, and API Resources or views for representation.

