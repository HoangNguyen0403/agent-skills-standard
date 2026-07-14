Not directly in the async polling loop. `psycopg2` and `subprocess.run` are blocking operations; they can stop the event loop from servicing other tasks, timers, cancellation, or health checks.

Prefer an async PostgreSQL driver and `asyncio.create_subprocess_exec` for subprocesses. If a synchronous dependency must remain, isolate it with `await asyncio.to_thread(...)` or an executor, impose timeouts, and ensure the worker can be cancelled and cleaned up. Also avoid overlapping polls and handle transient errors with bounded backoff.
