Register `ScheduleModule.forRoot()`, use a named `CronExpression`, and wrap all scheduler logic in `try/catch`. In a multi-pod deployment, acquire a Redis/redlock lease before doing work so only one instance runs a given schedule.

For anything expensive, have the cron handler enqueue an idempotent BullMQ job and let a worker handle retries, backoff, and execution. Set a lease TTL and renewal/release policy deliberately, add metrics for lock acquisition and failures, and verify behavior with multiple running instances rather than testing only one local process.

