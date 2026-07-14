# Spring MVC slice tests

Use `@WebMvcTest(YourController.class)` to load MVC infrastructure and the selected controller without the full application. Inject `MockMvc`, mock collaborators, and test routing, JSON mapping, validation, authorization, status codes, and error handling:

```java
@WebMvcTest(OrderController.class)
class OrderControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean OrderService service; // use @MockBean on versions that provide it
}
```

Cover malformed JSON, invalid fields, not-found, unauthorized/forbidden, and success cases. Keep databases and external services out of the slice. If security filters are loaded, configure test users/tokens and test actual rules, or disable them only when security is intentionally out of scope.



