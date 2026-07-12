Return a typed DTO, preferably a Java record, instead of `Map<String, Object>`:

```java
public record UserResponse(UUID id, String name, String email) {}

@GetMapping("/{id}")
UserResponse get(@PathVariable UUID id) {
    User user = service.find(id);
    return new UserResponse(user.id(), user.name(), user.email());
}
```

Use separate request and response DTOs when their contracts differ, and put examples and schema metadata on those DTOs with `@Schema`. The controller should handle HTTP concerns, validation, and mapping; the service should contain orchestration and business rules. Do not return a JPA `@Entity` directly because that couples the API to persistence, risks lazy-loading/serialization problems, and leaks fields.

For a consistent error contract, enable `spring.mvc.problem-details.enabled=true` and handle failures through `@RestControllerAdvice`, returning RFC 7807 `ProblemDetail` objects with only safe custom fields. Document successful and error responses with `@Operation` and `@ApiResponse`. This gives clients a stable, discoverable OpenAPI schema and lets the compiler catch accidental contract changes.


