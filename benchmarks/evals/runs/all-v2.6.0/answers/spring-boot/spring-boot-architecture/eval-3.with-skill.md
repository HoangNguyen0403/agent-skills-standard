No. A controller should be a thin web adapter: bind the request, apply `@Valid`, map DTOs, delegate to a service, and select the HTTP response. Business rules, orchestration, and transaction boundaries belong in the service layer.

```java
@RestController
@RequiredArgsConstructor
final class OrderController {
    private final OrderService service;

    @PostMapping("/orders")
    OrderResponse create(@Valid @RequestBody CreateOrderRequest request) {
        return service.create(request);
    }
}
```

Use immutable record DTOs for inputs and outputs; do not return `@Entity` instances. A service can coordinate repositories and other domain components and should own `@Transactional` behavior. Keep database access in repositories. Centralize failures with `@RestControllerAdvice` and RFC 7807 `ProblemDetail` rather than duplicating error handling in each controller. This separation prevents fat or god controllers, reduces coupling, and makes business rules testable without an HTTP context.


