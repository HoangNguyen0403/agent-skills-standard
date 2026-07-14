For Spring Boot 3, use Springdoc's WebMVC starter rather than manually hosting Swagger UI:

```xml
<dependency>
  <groupId>org.springdoc</groupId>
  <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
  <version>...</version>
</dependency>
```

Document the controller contract explicitly:

```java
@Operation(summary = "Find an order")
@ApiResponse(responseCode = "200", description = "Order found")
@GetMapping("/{id}")
OrderResponse get(@PathVariable UUID id) { ... }
```

Use typed DTOs, preferably Java records, for request and response models. Put representative values and constraints on the DTO with `@Schema`; do not expose JPA entities or `Map<String, Object>` as the public contract. Document every endpoint, including error responses, and use `@RestControllerAdvice` with RFC 7807 `ProblemDetail` responses. Enable Spring's problem-details support with:

```properties
spring.mvc.problem-details.enabled=true
```

The starter normally exposes `/swagger-ui.html` and the OpenAPI document at `/v3/api-docs`. If Spring Security protects the application, explicitly permit those documentation endpoints only in environments where that is appropriate; keep production exposure controlled. Never include stack traces or secrets in generated schemas or error responses.


