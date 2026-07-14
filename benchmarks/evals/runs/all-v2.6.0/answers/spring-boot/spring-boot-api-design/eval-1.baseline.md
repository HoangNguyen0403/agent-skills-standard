# Swagger/OpenAPI in Spring Boot 3

Use `springdoc-openapi-starter-webmvc-ui` (a 2.x release compatible with Spring Boot 3). It discovers MVC mappings and exposes Swagger UI at `/swagger-ui.html` and the document at `/v3/api-docs`. Configure paths and metadata in `application.yml`, and use `@Operation`, `@ApiResponse`, `@Parameter`, `@Schema`, and `@OpenAPIDefinition` where inference is insufficient.

Document request/response DTOs and errors (for example, `ProblemDetail`), define security schemes, and verify the generated contract in CI. In production, protect or disable the documentation and actuator endpoints; do not expose internal models or sensitive examples.



