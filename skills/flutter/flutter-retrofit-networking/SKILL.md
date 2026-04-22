---
name: flutter-retrofit-networking
description: Build type-safe HTTP networking with Dio and Retrofit including auth interceptors in Flutter. Use when integrating REST APIs with Dio or Retrofit.
metadata:
  triggers:
    files:
    - '**/data_sources/**'
    - '**/api/**'
    keywords:
    - Retrofit
    - Dio
    - RestClient
    - GET
    - POST
    - Interceptor
    - refreshing
---
# Retrofit & Dio Networking

## **Priority: P0 (CRITICAL)**


## Structure

```text
infrastructure/
├── data_sources/
│   ├── remote/       # Retrofit abstract classes
│   └── local/        # Cache/Storage
└── network/
    ├── dio_client.dart    # Custom Dio setup
    └── interceptors/      # Auth, Logging, Cache
```

## Implementation Workflow

1. **Define Retrofit clients** — Create abstract classes with `@RestApi()` and HTTP annotations (`@GET`, `@POST`). Methods return `Future<DTO>`.
2. **Create DTOs** — Use `@freezed` and `@JsonSerializable` for all request/response bodies.
3. **Map to domain** — Data sources must map DTOs to Domain Entities (e.g., `userDto.toDomain()`).
4. **Guard enums** — Always use `@JsonKey(unknownEnumValue: Status.unknown)` to prevent crashes from new backend values.
5. **Add auth interceptor** — Inject `Authorization: Bearer <token>` in `onRequest`.
6. **Handle token refresh** — On 401, lock Dio, call `refreshToken()`, update stored token, retry via `dio.fetch(err.requestOptions)`.
7. **Map failures** — Convert `DioException` to typed `Failure` objects (ServerFailure, NetworkFailure).

### Retrofit Client & Safe Enum DTO Examples

See [implementation examples](references/implementation.md) for RestClient definitions and safe enum DTO patterns.

## Anti-Patterns

- **No Manual JSON Parsing**: Use Retrofit's generated mappers instead of `jsonDecode`
- **No Global Dio Instances**: Inject `Dio` through DI
- **No Inline Try-Catch**: repository layer should handle all Retrofit exceptions
- **No Unguarded Enums**: Always include `unknownEnumValue` to prevent crashes on new backend values

## Reference & Examples

For RestClient definitions and Auth Interceptor implementation:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

feature-based-clean-architecture | error-handling