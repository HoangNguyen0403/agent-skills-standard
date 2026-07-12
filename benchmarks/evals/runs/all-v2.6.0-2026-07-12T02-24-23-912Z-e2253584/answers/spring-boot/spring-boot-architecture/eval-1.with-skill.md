Organize by business feature, with layers inside each feature, rather than one global `controllers`, `services`, and `repositories` package:

```text
com.example.app
  order/
    OrderController.java       // web adapter
    OrderService.java           // business orchestration
    OrderRepository.java        // persistence adapter/port
    OrderRequest.java
    OrderResponse.java          // records
  user/
    ...
  shared/
    error/
```

The dependency direction is inward: web depends on service/domain, and persistence implements an inner-facing repository port. Services must not depend on controllers. Controllers should handle HTTP, `@Valid`, and DTO mapping; services should own business rules, orchestration, and transaction boundaries; repositories should do database work only.

Use Java 17+ records for immutable API DTOs and never return a JPA entity directly. Add `@RestControllerAdvice` with RFC 7807 `ProblemDetail` for errors and Jakarta Bean Validation constraints on input DTOs. Put `@Transactional` on the service boundary, normally with `readOnly = true` for read paths. A practical verification pass checks that every response is a DTO, every input is validated, no inner layer imports web classes, and error responses do not expose stack traces.


