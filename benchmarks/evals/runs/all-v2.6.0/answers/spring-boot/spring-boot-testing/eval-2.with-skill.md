Use a focused `@WebMvcTest` for a controller slice. It loads MVC infrastructure and the controller, while downstream services are mocked:

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired MockMvc mvc;
    @MockBean OrderService service;

    @Test
    void returnsBadRequestWhenRequestIsInvalid() throws Exception {
        mvc.perform(post("/api/v1/orders")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
            .andExpect(status().isBadRequest());
    }
}
```

Use `@Valid` on controller inputs and put Jakarta constraints on request DTOs. Use AssertJ for Java assertions and verify the typed response, status, validation errors, and RFC 7807 error shape. Mock only downstream dependencies; do not create a broad base class full of `@MockBean`, because changing mocks can reload the application context for every test. Do not call real external services or databases from a slice test; use WireMock for HTTP behavior and Testcontainers for integration tests. Keep tests isolated and follow Red-Green-Refactor.


