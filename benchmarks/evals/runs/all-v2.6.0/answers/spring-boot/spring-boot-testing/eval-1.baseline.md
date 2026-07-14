# Integration tests with a real database

Use `@SpringBootTest` with Testcontainers. A PostgreSQL test can use `@Container` and `@DynamicPropertySource` to provide the container JDBC URL, username, and password; newer Spring Boot versions can use `@ServiceConnection`.

Run the real Flyway/Liquibase migrations against the container. Use isolated schemas or recreate containers when needed, avoid production data, and clean up created rows. Assert constraints, transactions, indexes/query behavior, and serialization rather than only mocked repository calls. Keep tests deterministic, verify container readiness, and account for CI resource limits.



