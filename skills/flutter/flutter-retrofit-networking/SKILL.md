---
name: flutter-retrofit-networking
description: 'HTTP networking standards using Dio and Retrofit with Auth interceptors. Use when integrating Dio, Retrofit, or API auth interceptors in Flutter. (triggers: **/data_sources/**, **/api/**, Retrofit, Dio, RestClient, GET, POST, Interceptor, refreshing)'
---

# Retrofit & Dio Networking

## **Priority: P0 (CRITICAL)**

Type-safe REST API communication using `Dio` and `Retrofit`.

## Structure

```text
infrastructure/
├── data_sources/
│   ├── remote/ # Retrofit abstract classes
│   └── local/ # Cache/Storage
└── network/
    ├── dio_client.dart # Custom Dio setup
    └── interceptors/ # Auth, Logging, Cache
```

## Implementation Guidelines

- **Retrofit Clients**: Define abstract classes with **@RestApi()**. Use standard HTTP annotations (**@GET('/route')**, **@POST('/route/{id}/cancel')** with **@Path('id')**). Methods must return `Future<DTO>`.
- **DTOs (Data Transfer Objects)**: Use **@freezed** and **@JsonSerializable** for all response/request bodies.
- **Mapping**: Data sources MUST map DTOs to Domain Entities (e.g., `userDto.toDomain()`).
- **Safe Enums**: Always use **@JsonKey(unknownEnumValue: OrderStatus.unknown)** for DTO enums with an `unknown` fallback value to prevent crashes when the backend introduces new values.
- **AuthInterceptor**: Logic for `Authorization: Bearer <token>` injection in `onRequest`.
- **Token Refresh**: Handle **401 Unauthorized** in `onError` by checking `DioException`, **locking Dio**, calling `refreshToken()`, **updating the stored token**, and **retrying** via `dio.fetch(err.requestOptions)`.
- **Failures**: Map `DioException` to custom `Failure` objects (ServerFailure, NetworkFailure).

## Anti-Patterns

- **No Manual JSON Parsing**: Do not use `jsonDecode(response.body)`; use Retrofit's generated mappers.
- **No Global Dio**: Do not use a static global Dio instance; use dependency injection.
- **No Try-Catch in API**: Do not put `try-catch` inside the Retrofit interface methods.
- **No Unsafe Enums**: Do not leave enums in DTOs without handling unknown values from the server.

## Reference & Examples

For RestClient definitions and Auth Interceptor implementation:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

feature-based-clean-architecture | error-handling
