Use Testcontainers. It starts a disposable, real PostgreSQL instance in Docker for the test and removes it afterward, so you do not need a separately managed PostgreSQL server.

Add the test dependency (use a version compatible with your project):

```xml
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>postgresql</artifactId>
  <version>1.20.6</version>
  <scope>test</scope>
</dependency>
<dependency>
  <groupId>org.testcontainers</groupId>
  <artifactId>junit-jupiter</artifactId>
  <version>1.20.6</version>
  <scope>test</scope>
</dependency>
```

For a plain JUnit test:

```java
import org.junit.jupiter.api.Test;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.junit.jupiter.api.Assertions.assertEquals;

@Testcontainers
class UserRepositoryIT {
    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("testdb")
                    .withUsername("test")
                    .withPassword("test");

    @Test
    void readsFromPostgres() throws Exception {
        try (var connection = postgres.createConnection("")
                ; var statement = connection.createStatement()) {
            statement.execute("create table users (id int primary key, name text)");
            statement.execute("insert into users values (1, 'Ada')");

            try (var result = statement.executeQuery("select name from users where id = 1")) {
                result.next();
                assertEquals("Ada", result.getString(1));
            }
        }
    }
}
```

If the application uses Spring Boot, register the container's dynamically mapped connection settings instead of hard-coding a port:

```java
@Testcontainers
@SpringBootTest
class UserRepositoryIT {
    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }
}
```

Run the tests with Docker or another Testcontainers-compatible container runtime running. Testcontainers pulls the image on the first run, starts PostgreSQL on a random host port, and supplies the correct JDBC URL. Use a fixed image tag, migrations (such as Flyway or Liquibase), and isolated database state per test or test class for reproducible tests.

