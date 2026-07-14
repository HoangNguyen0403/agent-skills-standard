Do not mock the database for every E2E test. E2E tests should exercise the application against a real, isolated database or a close equivalent so migrations, ORM mappings, constraints, transactions, and queries are tested. Use Testcontainers or a disposable schema/database, apply migrations, seed minimal fixtures, and clean up deterministically.

Mock external providers or slow/unavailable third parties at the boundary, and use repository/service mocks in unit tests. Keep a smaller, fast suite with fakes plus a focused real-database integration/E2E suite. Ensure parallel runs cannot share mutable data, use unique test identifiers, wait for readiness, and never point tests at production. Include failure/rollback and authorization cases, not only happy-path HTTP assertions.

