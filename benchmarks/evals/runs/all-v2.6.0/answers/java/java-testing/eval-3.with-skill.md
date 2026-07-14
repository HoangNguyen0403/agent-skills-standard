Use Testcontainers: it runs a real, disposable PostgreSQL container for the test suite, so you do not need a separately managed PostgreSQL server. You do need a Docker-compatible runtime such as Docker Desktop, Podman, or Colima.

For Maven, add the PostgreSQL JDBC driver and Testcontainers modules. Import the Testcontainers BOM so the module versions stay aligned:

```xml
<dependencyManagement>
  <dependencies>
    <dependency>
      <groupId>org.testcontainers</groupId>
      <artifactId>testcontainers-bom</artifactId>
      <version>${testcontainers.version}</version>
      <type>pom</type>
      <scope>import</scope>
    </dependency>
  </dependencies>
</dependencyManagement>

<dependencies>
  <dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>junit-jupiter</artifactId>
    <scope>test</scope>
  </dependency>
  <dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
  </dependency>
</dependencies>
```

With Spring Boot, `spring-boot-starter-test` supplies JUnit 5 and AssertJ. A JUnit 5 integration test can start PostgreSQL once for the class and publish its dynamically assigned connection details:

```java
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@Testcontainers
class UserRepositoryIT {

    @Container
    static final PostgreSQLContainer<?> postgres =
            new PostgreSQLContainer<>("postgres:16-alpine")
                    .withDatabaseName("integration_test")
                    .withUsername("test")
                    .withPassword("test");

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Test
    @DisplayName("persists and reads a user from PostgreSQL")
    void saveUser_WhenValid_ReturnsPersistedUser() {
        // Exercise the real repository/service here.
        // Keep the test independent by cleaning its data or rolling back its transaction.
        assertThat(postgres.isRunning()).isTrue();
    }
}
```

`@Container` manages startup and cleanup, while `@DynamicPropertySource` prevents hard-coding a host port. For a non-Spring application, use `postgres.getJdbcUrl()`, `getUsername()`, and `getPassword()` to configure your JDBC client in `@BeforeEach` or a test fixture. Keep test methods isolated and order-independent; use migrations against the container and clean up or roll back data between tests. Run the class with the normal test command, for example `mvn test -Dtest=UserRepositoryIT`.

