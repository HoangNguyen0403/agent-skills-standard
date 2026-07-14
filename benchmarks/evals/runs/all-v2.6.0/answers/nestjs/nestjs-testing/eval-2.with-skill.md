Do not mock the database in a critical NestJS E2E test. Start the app against a real isolated test database, because mocking removes the ORM, migrations, constraints, transactions, and query behavior that the E2E test is meant to verify.

Create the app in `beforeAll`, close it and the database in `afterAll`, and clean state after each test with a transaction rollback or `TRUNCATE` in dependency order. Mocks are appropriate for unit tests; they should not replace the database in a full application-flow test.

