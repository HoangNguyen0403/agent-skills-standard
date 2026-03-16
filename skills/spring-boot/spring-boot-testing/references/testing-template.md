# Modern Integration Testing Template

This reference demonstrates the "Base Class" pattern for Integration Tests using Spring Boot 3.1+ and Testcontainers.

> [!TIP]
> Use this pattern to avoid spinning up new containers for every test class. Reusing containers significantly speeds up test suites.

````java
package com.example.demo;

import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

// 1. Meta-Annotation to reduce boilerplate on Test classes
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
public @interface IntegrationTest {}

// 2. Base Class (Alternative to Meta-Annotation if shared state is needed)
// Usage: class UserFlowTest extends BaseIntegrationTest { ... }
public abstract class BaseIntegrationTest {

    // 3. ServiceConnection (Spring Boot 3.1+): Automatically configures spring.datasource.url/username/password
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16")
        .withReuse(true); // experimental feature to keep container alive across runs
}

## Slice Test Templates

### Web Layer (@WebMvcTest)

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mvc;
    @MockBean UserService service;

    @Test
    void shouldReturnUser() throws Exception {
        when(service.findById(1L)).thenReturn(new User(1L, "Alice"));

        mvc.perform(get("/users/1"))
           .andExpect(status().isOk())
           .andExpect(jsonPath("$.name").value("Alice"));
    }
}
````

### Data Layer (@DataJpaTest)

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Import(TestcontainersConfig.class)
class UserRepositoryTest {
    @Autowired UserRepository repo;

    @Test
    void shouldPersistUser() {
        repo.save(new User("Bob"));
        assertThat(repo.findByName("Bob")).isPresent();
    }
}
```
