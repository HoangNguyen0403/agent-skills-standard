The modern Java 21 approach is structured concurrency with virtual threads.

```java
import java.util.concurrent.StructuredTaskScope;

public class ApiService {
    private final RemoteClient client;

    public ApiService(RemoteClient client) {
        this.client = client;
    }

    public CombinedResponse fetchAll(String userId) throws Exception {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            StructuredTaskScope.Subtask<ResponseA> a =
                    scope.fork(() -> client.fetchA(userId));
            StructuredTaskScope.Subtask<ResponseB> b =
                    scope.fork(() -> client.fetchB(userId));
            StructuredTaskScope.Subtask<ResponseC> c =
                    scope.fork(() -> client.fetchC(userId));

            scope.join();
            scope.throwIfFailed();

            return new CombinedResponse(a.get(), b.get(), c.get());
        }
    }
}
```

Why this is the preferred Java 21 style:

- `StructuredTaskScope` makes the 3 calls part of one unit of work.
- `ShutdownOnFailure` cancels sibling tasks if one call fails.
- `scope.fork(...)` runs each task concurrently.
- In Java 21, these subtasks are designed to work well with virtual-thread-based concurrency for I/O-heavy work.

If you want a timeout too:

```java
import java.time.Instant;
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.TimeoutException;

public CombinedResponse fetchAllWithTimeout(String userId) throws Exception {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        var a = scope.fork(() -> client.fetchA(userId));
        var b = scope.fork(() -> client.fetchB(userId));
        var c = scope.fork(() -> client.fetchC(userId));

        boolean completed = scope.joinUntil(Instant.now().plusSeconds(2));
        if (!completed) {
            scope.shutdown();
            throw new TimeoutException("API calls timed out");
        }

        scope.throwIfFailed();
        return new CombinedResponse(a.get(), b.get(), c.get());
    }
}
```

If you cannot use preview structured concurrency yet, the fallback is:

```java
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

public CombinedResponse fetchAllFallback(String userId) throws Exception {
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        Future<ResponseA> a = executor.submit(() -> client.fetchA(userId));
        Future<ResponseB> b = executor.submit(() -> client.fetchB(userId));
        Future<ResponseC> c = executor.submit(() -> client.fetchC(userId));

        return new CombinedResponse(a.get(), b.get(), c.get());
    }
}
```

So: for modern Java 21, prefer `StructuredTaskScope` for related parallel API calls, with virtual-thread-based execution underneath, and use `newVirtualThreadPerTaskExecutor()` as the non-structured fallback.

