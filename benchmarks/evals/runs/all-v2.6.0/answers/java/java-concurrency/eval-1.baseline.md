In modern Java 21, a clean way is to use `CompletableFuture` with a virtual-thread executor, then wait for all three together.

```java
import java.util.concurrent.*;

public class ParallelCalls {
    public static void main(String[] args) throws Exception {
        try (ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor()) {
            CompletableFuture<String> call1 =
                    CompletableFuture.supplyAsync(() -> fetch("api-1"), executor);
            CompletableFuture<String> call2 =
                    CompletableFuture.supplyAsync(() -> fetch("api-2"), executor);
            CompletableFuture<String> call3 =
                    CompletableFuture.supplyAsync(() -> fetch("api-3"), executor);

            CompletableFuture.allOf(call1, call2, call3).join();

            String result1 = call1.join();
            String result2 = call2.join();
            String result3 = call3.join();

            System.out.println(result1);
            System.out.println(result2);
            System.out.println(result3);
        }
    }

    static String fetch(String name) {
        return "response from " + name;
    }
}
```

Why this is the modern Java 21 style:

- `newVirtualThreadPerTaskExecutor()` is lightweight and ideal for I/O-bound API calls.
- `CompletableFuture` makes it easy to launch tasks concurrently and combine results.
- `CompletableFuture.allOf(...).join()` waits for all calls to finish.

If you want even simpler structured concurrency, Java 21 also includes `StructuredTaskScope` as a preview API, which is great when these tasks belong to one operation and should be managed together.

