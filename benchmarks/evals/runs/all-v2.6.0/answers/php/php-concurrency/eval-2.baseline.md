Use an event loop and non-blocking extensions or libraries for I/O. Start the operation, register callbacks or awaitables, and let the loop service other work while the operation is pending. Do not call blocking file, socket, HTTP, or database APIs on the event-loop thread.

For HTTP, use a client with an async API; for sockets, use stream_select or an event-loop library. Limit concurrency, handle timeouts and cancellation, and propagate errors. Non-blocking I/O improves throughput for waiting work but does not make CPU-heavy PHP code parallel; use workers or processes for CPU-bound tasks.

