# Architecture Implementation Examples

## Feature Package Structure

```text
com.myapp.order
├── OrderController.java    // REST API
├── OrderService.java       // Business Logic
├── OrderRepository.java    // Data Access
├── internal                // Package-private impl details
│   └── DefaultOrderService.java
└── dto
    ├── CreateOrderRequest.java
    └── OrderResponse.java
```

## Modern DTO with Records

```java
// Immutable DTO
public record CreateUserRequest(
    @NotBlank String username,
    @Email String email
) {}

@RestController
@RequestMapping("/api/v1/users")
class UserController {
    private final UserService service;

    // Constuctor Injection (Lombok @RequiredArgsConstructor implied or explicit)
    public UserController(UserService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse create(@Valid @RequestBody CreateUserRequest req) {
        return service.register(req);
    }
}
```

## Global Exception Handling

```java
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    ProblemDetail handleBusiness(BusinessException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
        problem.setTitle("Business Rule Violation");
        return problem;
    }
}
```

## Immutable DTO with Java Record

```java
// Immutable DTO with Java Record
public record CreateOrderRequest(
    @NotBlank String productName,
    @Positive int quantity
) {}

public record OrderResponse(Long id, String productName, int quantity, String status) {
    public static OrderResponse from(Order order) {
        return new OrderResponse(order.getId(), order.getProductName(), order.getQuantity(), order.getStatus().name());
    }
}
```
