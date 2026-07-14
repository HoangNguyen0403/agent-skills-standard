Prefer URI versioning for a Spring Boot REST API, for example `/api/v1/orders`. It is visible in links, straightforward to cache and route, and easy to test. Keep the version at the resource boundary rather than duplicating version decisions throughout the service layer:

```java
@RestController
@RequestMapping("/api/v1/orders")
final class OrderController { ... }
```

When the contract changes incompatibly, add `/api/v2` with its own DTOs and controller adapter. Services and domain logic can remain shared only when their behavior is genuinely compatible. Do not use header versioning as the default; it is harder to test and cache.

Document the version in OpenAPI and mark the old operation or model as deprecated. In Java, use `@Deprecated` where appropriate and expose the deprecation in the OpenAPI description. Define a retirement date and migration guidance, then keep v1 and v2 behavior covered independently by controller/contract tests. Return typed DTO records and consistent RFC 7807 `ProblemDetail` errors from both versions. Never let version-specific controllers return entities directly or expose stack traces in errors.


