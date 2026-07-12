Verify both the event-loop behavior and the watcher's lifecycle:

- No blocking database, filesystem, or subprocess calls run on the event-loop thread.
- Poll intervals, deadlines, and backoff use monotonic time and cannot create overlapping polls.
- Cancellation reaches the polling task, pending I/O, and any child process; shutdown waits for cleanup.
- Exceptions are observed, logged with useful context, and do not silently kill the background task.
- Startup and shutdown are idempotent, and the watcher cannot be started twice accidentally.
- Retries are bounded and do not duplicate side effects; health and liveness signals reflect actual task state.

Test normal polling, transient failures, slow dependencies, cancellation during each await, repeated start/stop, and process termination with a controllable clock or fake dependencies.
