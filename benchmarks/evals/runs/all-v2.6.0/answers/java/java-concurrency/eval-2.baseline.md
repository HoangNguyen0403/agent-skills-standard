It depends on the kind of work your requests do.

Use a thread pool if:
- Requests are CPU-heavy
- You need strict control over concurrency
- You want to limit resource usage predictably

Use Virtual Threads if:
- Requests spend a lot of time waiting on I/O
- You want a simple thread-per-request style
- You are on a modern Java version that supports them well

For a REST server handling thousands of concurrent requests, Virtual Threads are often a great default when the workload is mostly blocking I/O like database calls, HTTP calls, or file access. They let you keep straightforward code without needing a large platform-thread pool.

A traditional thread pool is still better for CPU-bound work, because Virtual Threads do not create more CPU capacity. If too many CPU-heavy tasks run at once, performance can still degrade.

Practical rule:
- Mostly blocking I/O: prefer Virtual Threads
- Mostly CPU work: prefer a bounded thread pool
- Mixed workload: use Virtual Threads for request handling, but offload expensive CPU tasks to a bounded executor

