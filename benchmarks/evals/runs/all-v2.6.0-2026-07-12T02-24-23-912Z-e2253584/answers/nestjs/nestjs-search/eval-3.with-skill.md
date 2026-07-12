Run critical search E2E tests against a real `elasticsearch:8` container rather than mocking the client. Start the app and container in the test harness, apply the index mapping, write a database record, wait for the asynchronous indexing job, then query Elasticsearch and assert the result.

Clean both the database and index between tests, use deterministic document IDs, and test retry/failure behavior. Unit tests may mock the `SearchService` for application logic, but mocks cannot verify mappings, analyzers, serialization, or actual synchronization.

