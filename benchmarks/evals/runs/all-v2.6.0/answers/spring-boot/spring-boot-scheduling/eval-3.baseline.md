# Graceful scheduled-task failures

Wrap job execution in a boundary that records expected failures and lets the scheduler continue. Configure a `TaskScheduler`/pool and an `ErrorHandler` for uncaught exceptions rather than allowing failures to disappear. Use bounded exponential retries for transient dependency failures, or enqueue failed units for later processing and dead-letter handling.

Make each unit idempotent and checkpoint or claim work so retries do not duplicate effects. Distinguish transient, validation, and permanent failures. Emit run duration, success/failure, retries, skipped/overlap, and last-success metrics; alert on consecutive failures or stale success. Test exceptions, timeouts, partial batches, restart recovery, and overlap.



