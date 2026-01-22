# Structured Concurrency Reference

## Virtual Threads (Loom)

Java 21 introduced Virtual Threads, which are lightweight threads managed by the JVM. You should use them for I/O-bound tasks.

### Basic Usage

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 10_000).forEach(i -> {
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1));
            return i;
        });
    });
} // Executor closes and waits for all tasks here
```

### StructuredTaskScope

For coordinating multiple related tasks (e.g., fetching data from multiple APIs), use `StructuredTaskScope`.

```java
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.ExecutionException;

Response handle() throws ExecutionException, InterruptedException {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {

        // Fork tasks
        // These run in virtual threads by default if scope is configured (default behavior varies by JDK preview status, checking docs recommended)
        // Generally usually wraps a virtual thread executor.

        Supplier<String> user  = scope.fork(() -> api.fetchUser());
        Supplier<Order> order = scope.fork(() -> db.fetchOrder());

        // Wait for all to finish or one to fail
        scope.join().throwIfFailed();

        // Both results are now available safely
        return new Response(user.get(), order.get());
    }
}
```
