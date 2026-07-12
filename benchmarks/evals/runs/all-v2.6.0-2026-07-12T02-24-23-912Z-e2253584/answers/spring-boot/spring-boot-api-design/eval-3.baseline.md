# Typed Spring Boot responses

Define public response DTOs or Java records rather than returning `Map<String, Object>`:

```java
public record UserResponse(UUID id, String name, String email) {}

@GetMapping("/{id}")
public ResponseEntity<UserResponse> get(@PathVariable UUID id) {
    return ResponseEntity.ok(userService.find(id));
}
```

Map domain or persistence objects at the API boundary so internal fields do not leak. Use `ResponseEntity<T>` when status or headers vary; otherwise return `T`. Use typed collection/page envelopes and a consistent error model such as `ProblemDetail`, handled by `@RestControllerAdvice`. Add validation and Jackson annotations only when required by the wire contract.



