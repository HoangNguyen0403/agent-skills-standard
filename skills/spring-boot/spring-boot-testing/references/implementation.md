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

## Order Controller Slice Test

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean OrderService orderService;

    @Test
    void shouldReturn404WhenOrderNotFound() throws Exception {
        given(orderService.findById(99L)).willThrow(new OrderNotFoundException(99L));

        mockMvc.perform(get("/api/orders/99"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.detail").value("Order 99 not found"));
    }

    @Test
    void shouldCreateOrder() throws Exception {
        given(orderService.create(any())).willReturn(new OrderResponse(1L, "Widget", 5, "PENDING"));

        mockMvc.perform(post("/api/orders")
                .contentType(APPLICATION_JSON)
                .content("""
                    {"productName": "Widget", "quantity": 5}
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.id").value(1));
    }
}
```
