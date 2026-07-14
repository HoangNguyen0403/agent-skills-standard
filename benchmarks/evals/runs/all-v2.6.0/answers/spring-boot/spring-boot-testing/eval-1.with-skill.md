Use a real database in an integration test through Testcontainers rather than substituting H2 for a production database with different SQL and transaction behavior. Start the container for the same engine/version family as production, provide its connection properties to Spring, and run the test against the real repository and migration path.

```java
@SpringBootTest
@Testcontainers
class OrderRepositoryIT {
    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:...");

    @DynamicPropertySource
    static void database(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url", postgres::getJdbcUrl);
        r.add("spring.datasource.username", postgres::getUsername);
        r.add("spring.datasource.password", postgres::getPassword);
    }
}
```

Prefer AssertJ assertions, run Flyway/Liquibase migrations, and clean data between tests or use transaction isolation appropriate to the test. Keep external dependencies deterministic and avoid network calls outside controlled containers. Follow Red-Green-Refactor and verify coverage with JaCoCo, but do not confuse a coverage percentage with database-behavior coverage. Test both clean startup and the upgrade/migration path.


