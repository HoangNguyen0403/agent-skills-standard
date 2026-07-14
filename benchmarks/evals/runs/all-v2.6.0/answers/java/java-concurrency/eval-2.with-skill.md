Use Virtual Threads if your REST server is mostly I/O-bound and spends a lot of time waiting on databases, HTTP calls, or disk. In Java 21, that is usually the better default for “thousands of concurrent requests” because you can keep the simple thread-per-request model without maintaining a large platform-thread pool.

Keep using a traditional thread pool for CPU-bound work, or when you need to strictly cap access to a scarce resource. Virtual threads improve scalability for blocking workloads, but they do not make CPU work cheaper.

A practical rule:

- Blocking, high-concurrency request handling: Virtual Threads
- CPU-heavy background tasks: fixed thread pool
- Do not pool virtual threads themselves

Also avoid long blocking operations inside `synchronized` blocks with virtual threads, because that can pin carrier threads. Prefer `ReentrantLock` if you need explicit locking.

So for a modern Java REST server: use Virtual Threads for request handling, and keep classic pools only where you need bounded parallelism.

