Move CPU-heavy work to a worker thread, a BullMQ/background worker, or a separate service. Worker threads are suitable for CPU-bound JavaScript that needs to remain near the application; a queue/service is better for durable, retryable, independently scalable jobs.

The HTTP endpoint should validate input, persist or stage the work, enqueue an idempotent job, and return `202` with a job ID. A worker should enforce time/memory limits, report progress/status, retry transient failures with backoff, and store results. Do not pass large buffers through an unbounded queue; use object storage or a database reference. Size worker concurrency based on CPU and downstream capacity, and observe queue latency, failures, event-loop lag, and worker memory.

