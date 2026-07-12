Avoid doing long-running work directly in a `@Cron` callback. The callback should validate the schedule, acquire any required lock, and enqueue a durable job, then return quickly. A worker can process the task with bounded concurrency, timeouts, retries/backoff, idempotency, progress, and dead-letter handling.

Direct processing is acceptable only for short, bounded, idempotent work where missed/overlapping execution is explicitly controlled. Long handlers can overlap the next tick, block shutdown, keep a pod unready, and be lost on process termination. Persist enough state to resume, and use a Kubernetes CronJob or queue-backed worker when execution must survive pod restarts.

