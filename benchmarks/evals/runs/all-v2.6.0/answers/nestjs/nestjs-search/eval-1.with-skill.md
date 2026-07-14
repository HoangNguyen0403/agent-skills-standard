Treat PostgreSQL as the source of truth and synchronize Elasticsearch asynchronously. Avoid `await db.save(); await es.index()` in the request because a partial failure leaves the two systems inconsistent.

Use an outbox/domain event or CDC: commit the database change, emit `EntityUpdated`, enqueue an indexing job, and let a worker transform the entity into a flatter search document with retries and idempotent document IDs. Debezium CDC is the strongest consistency option when operational complexity is acceptable. Critical E2E tests should run Elasticsearch 8 in Docker rather than mocking the search engine.

