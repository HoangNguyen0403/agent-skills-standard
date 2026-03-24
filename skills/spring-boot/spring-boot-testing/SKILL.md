---
name: spring-boot-testing
description: "Write unit, integration, and slice tests for Spring Boot 3 applications. Use when writing unit tests, integration tests, or slice tests for Spring Boot 3 applications. (triggers: **/*Test.java, webmvctest, datajpatest, testcontainers, assertj)"
---

# Spring Boot Testing Standards

## **Priority: P0**

## Follow TDD Workflow

1.  **Red**: Write a failing test (e.g., `returns 404`).
2.  **Green**: Implement minimal code to pass.
3.  **Refactor**: Clean up while keeping tests green.
4.  **Coverage**: Verify with JaCoCo.

## Write Slice and Integration Tests

- **Real Infrastructure**: Use **Testcontainers** for DB/Queues. Avoid H2/Embedded.
- **Assertions**: Use **AssertJ** (`assertThat`) over JUnit assertions.
- **Isolation**: Use `@MockBean` for downstream dependencies in Slice Tests.

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

## Anti-Patterns

- **No Dirty Contexts**: Avoid @MockBean in base classes; it reloads context per test.
- **No network I/O in tests**: Mock external calls with WireMock.
- **No System.out in tests**: Use AssertJ assertions instead.

## References

- [Implementation Examples](references/implementation.md)
