Move CPU-heavy work such as image processing, expensive crypto, or large transformations out of the HTTP event loop. Use `worker_threads` for CPU-bound local work, or enqueue a job to BullMQ/RabbitMQ when it should be retried and scaled independently.

The request path should validate input, persist a job record, enqueue a job, and return a queued status. The worker performs the work and updates the record. Do not block the controller waiting for completion; make jobs idempotent and configure retries/backoff and bounded retention.

