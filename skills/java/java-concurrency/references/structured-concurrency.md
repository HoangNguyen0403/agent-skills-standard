# Virtual Threads & Structured Concurrency Reference

## Virtual Threads (stable since JDK 21)

Virtual threads are lightweight threads managed by the JVM. Use them for I/O-bound work; do not pool them.

```java
try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
    IntStream.range(0, 10_000).forEach(i -> {
        executor.submit(() -> {
            Thread.sleep(Duration.ofSeconds(1));
            return i;
        });
    });
} // close() waits for submitted tasks; failures surface through the Future handles
```

Stable fan-out with failure handling stays explicit — `ExecutorService` has no structured scope. Take completions in arrival order so a failure in *either* task is observed without blocking on a chosen one, then interrupt the outstanding sibling:

```java
Response load(String userId) throws InterruptedException, ExecutionException {
    try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
        var completion = new ExecutorCompletionService<Object>(executor);
        Future<Object> userTask = completion.submit(() -> api.fetchUser(userId));
        Future<Object> orderTask = completion.submit(() -> db.fetchOrder(userId));

        for (int i = 0; i < 2; i++) {
            try {
                completion.take().get();   // returns on the first finished task, success or failure
            } catch (ExecutionException | InterruptedException e) {
                userTask.cancel(true);     // interrupt the outstanding sibling
                orderTask.cancel(true);
                throw e;                   // interruption still reaches the caller
            }
        }
        return new Response((User) userTask.get(), (Order) orderTask.get());
    }
}
```

Cancellation is cooperative: `cancel(true)` interrupts, so it stops work blocked in interruptible I/O or `Thread.sleep`. Code that ignores interruption runs to completion, and the executor's `close()` waits for it — do not claim a task stopped unless its code observes interruption.

## StructuredTaskScope (preview — opt-in only)

`StructuredTaskScope` groups related tasks under one scope. `ShutdownOnFailure` initiates scope shutdown as soon as one forked task fails (siblings are then cancelled); `throwIfFailed()` only **reports** the recorded failure — it does not initiate cancellation. It is a **preview API**: preview in JDK 21 and still preview in current JDKs, and its API changed across previews. Adopt it only when the project accepts preview features.

Requirements before emitting this code:

1. Exact JDK pin (the preview API is tied to that JDK, not to "Java 21+" generally).
2. `--enable-preview` for both `javac` and `java`; a preview-compiled class fails on a runtime without the flag.
3. Verify the shape against that JDK's own javadoc — the JDK 21 code below is not the later preview API.

```java
// JDK 21 preview shape (JEP 453)
import java.util.concurrent.StructuredTaskScope;
import java.util.concurrent.StructuredTaskScope.Subtask;

Response handle(String userId) throws ExecutionException, InterruptedException {
    try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
        Subtask<User> user = scope.fork(() -> api.fetchUser(userId));
        Subtask<Order> order = scope.fork(() -> db.fetchOrder(userId));

        // join() waits until every forked task finishes or the scope shuts down.
        // A failed task has already initiated sibling shutdown inside ShutdownOnFailure.
        scope.join();
        // throwIfFailed() rethrows the recorded failure; it does not cancel anything itself.
        scope.throwIfFailed();

        return new Response(user.get(), order.get());
    }
}
```

Preview-semantics checklist when it is in use: failure-triggered sibling shutdown (not `throwIfFailed()`), `join()` returning after shutdown started even if some tasks are still finishing, interruption behaviour, and exception unwrapping — all exercised by a test on the pinned JDK.

## Pinning and locks

- JDK 21–23: blocking inside `synchronized` (monitor) pins the carrier thread.
- JDK 24+ ([JEP 491](https://openjdk.org/jeps/491)): monitors no longer pin the carrier, so `synchronized` is a normal choice again.
- Prefer `ReentrantLock` for timed `tryLock`, interruptible locking, fairness, or multiple `Condition`s — those reasons stand on every JDK.
- Any throughput claim needs a measurement on the target JDK; guidance alone is not a benchmark.
