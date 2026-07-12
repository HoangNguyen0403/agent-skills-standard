Every pod registers and runs `@Cron()`, so three replicas naturally execute the job three times. Wrap the handler with a Redis distributed lock using an atomic `SET key randomValue NX PX ttl`; only the lock holder proceeds, and release only when the stored value still belongs to that holder.

Register `ScheduleModule.forRoot()`, use a lock TTL longer than the expected enqueue operation, and test with at least two instances. Keep the cron handler short: enqueue a job ID to BullMQ, where a worker performs the actual work. Add `try/catch` around the scheduler path so an exception does not crash the process.

