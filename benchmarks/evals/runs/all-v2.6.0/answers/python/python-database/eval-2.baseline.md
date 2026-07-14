Own the transaction at the application/service (use-case) boundary that coordinates the repository writes. That boundary should begin the transaction, call the repositories, and commit only if all writes succeed; otherwise it should roll back and propagate the error.

Repositories should perform individual persistence operations using an injected connection, session, or unit-of-work rather than each opening and committing its own transaction. This makes the business invariant and transaction scope explicit and keeps multiple repository writes atomic.
