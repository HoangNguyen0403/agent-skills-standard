# Testing Implementation Examples

## Controller Slice Test (Fast)

```java
@WebMvcTest(UserController.class)
class UserControllerTest {
    @Autowired MockMvc mvc;
    @MockBean UserService service; // Mocks the business layer

    @Test
    void shouldCreateUser() throws Exception {
        when(service.create(any())).thenReturn(new UserResponse("1", "alice"));

        mvc.perform(post("/api/users")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"username": "alice"}
                """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.username").value("alice"));
    }
}
```

## Integration Test with Testcontainers (Modern Boot 3.1+)

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Testcontainers
class FullStackTest {
    // @ServiceConnection automatically maps spring.datasource.* properties
    // No need for @DynamicPropertySource!
    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");

    @Test
    void flow() {
        // DB is ready to use
    }
}
```
