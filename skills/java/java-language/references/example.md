# Java Language — Examples

## Records + Pattern Matching (Java 21+)

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

## Virtual Threads (stable, Java 21+)

```java
// Stable since Java 21: take completions in arrival order, so a failure in either call is
// observed immediately; cancel unfinished siblings (interrupt) and rethrow.
@SuppressWarnings("unchecked") // the completion service erases the List<Order> type
DashboardData load(String userId) throws InterruptedException, ExecutionException {
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        var completion = new ExecutorCompletionService<Object>(executor);
        Future<Object> userTask = completion.submit(() -> userService.findById(userId));
        Future<Object> ordersTask = completion.submit(() -> orderService.findByUser(userId));

        for (int i = 0; i < 2; i++) {
            try {
                completion.take().get();   // returns on the first finished task, success or failure
            } catch (ExecutionException | InterruptedException e) {
                userTask.cancel(true);     // interrupt the outstanding sibling
                ordersTask.cancel(true);
                throw e;                   // interruption still reaches the caller
            }
        }
        return new DashboardData((User) userTask.get(), (List<Order>) ordersTask.get());
    }
}
```

## Text Blocks (Java 15+)

```java
// The opening """ must be followed by a line terminator;
// the closing delimiter position controls incidental indentation.
String sql = """
    SELECT id, name
    FROM users
    WHERE active = true
    """;

String json = """
    {"id": "%s", "active": true}
    """.formatted(userId);
```

## StructuredTaskScope (preview only — JDK 21 shape)

```java
// PREVIEW: requires an exact JDK pin plus --enable-preview for both compilation and runtime.
// This is the JDK 21 preview API; later previews changed the types and method shapes.
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.Subtask;

try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
    Subtask<User> userTask = scope.fork(() -> userService.findById(userId));
    Subtask<List<Order>> ordersTask = scope.fork(() -> orderService.findByUser(userId));
    // join() returns when all tasks finish or the scope has shut down;
    // in ShutdownOnFailure a failing task has already initiated that shutdown.
    scope.join();          // throws InterruptedException
    // throwIfFailed() reports the recorded failure; cancellation already happened.
    scope.throwIfFailed(); // throws ExecutionException
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
