Use an async database client or one Fiber per query, with a separate PDO connection for each Fiber. Do not share mutable connection state across Fibers and do not run blocking PDO calls inside an event loop unless they are isolated in an appropriate worker. Bound concurrency, aggregate results, and propagate each query's exception.

