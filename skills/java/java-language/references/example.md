# Java Language — Examples

## Records + Pattern Matching (Java 21)

```java
// Record: immutable DTO, no boilerplate
public record User(String id, String name) {}
public record Order(String id, User owner, double total) {}

// Pattern Matching with Switch Expression
public String describe(Object obj) {
    return switch (obj) {
        case User(var id, var name) -> "User: " + name;        // Record pattern
        case Order o when o.total() > 1000 -> "Large order";   // Guard
        case String s when s.isBlank() -> "Empty string";
        case null -> "null value";
        default -> "Unknown: " + obj.getClass().getSimpleName();
    };
}
```

## Sealed Classes for Domain Modelling

```java
public sealed interface PaymentResult
    permits PaymentResult.Success, PaymentResult.Failure, PaymentResult.Pending {}

public record Success(String transactionId) implements PaymentResult {}
public record Failure(String reason) implements PaymentResult {}
public record Pending(String referenceId) implements PaymentResult {}

// Exhaustive switch (no default needed)
String message = switch (result) {
    case Success s -> "Paid: " + s.transactionId();
    case Failure f -> "Failed: " + f.reason();
    case Pending p -> "Pending: " + p.referenceId();
};
```

## Virtual Threads + Structured Concurrency (Java 21)

```java
try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    var userTask = scope.fork(() -> userService.findById(userId));
    var ordersTask = scope.fork(() -> orderService.findByUser(userId));
    scope.join().throwIfFailed();

    return new DashboardData(userTask.get(), ordersTask.get());
}
```

## Streams + Optional

```java
// Prefer toList() over Collectors.toList() (Java 16+)
List<String> activeNames = users.stream()
    .filter(User::isActive)
    .map(User::name)
    .toList();

// Optional — map, filter, orElseThrow
String name = repo.findById(id)
    .filter(User::isActive)
    .map(User::name)
    .orElseThrow(() -> new UserNotFoundException(id));
```
