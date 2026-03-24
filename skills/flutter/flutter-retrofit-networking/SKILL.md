---
name: flutter-retrofit-networking
description: "Build type-safe HTTP networking with Dio and Retrofit including auth interceptors. Use when integrating Dio, Retrofit, or API auth interceptors in Flutter. (triggers: **/data_sources/**, **/api/**, Retrofit, Dio, RestClient, GET, POST, Interceptor, refreshing)"
---

# Retrofit & Dio Networking

## **Priority: P0 (CRITICAL)**

Type-safe REST API communication using `Dio` and `Retrofit`.

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

### Retrofit Client Example

```dart
@RestApi()
abstract class OrderRemoteDataSource {
  factory OrderRemoteDataSource(Dio dio) = _OrderRemoteDataSource;

  @GET('/orders/{id}')
  Future<OrderDto> getOrder(@Path('id') String id);

  @POST('/orders/{id}/cancel')
  Future<void> cancelOrder(@Path('id') String id);
}
```

### Safe Enum DTO Example

```dart
@freezed
class OrderDto with _$OrderDto {
  const factory OrderDto({
    required String id,
    @JsonKey(unknownEnumValue: OrderStatus.unknown)
    required OrderStatus status,
  }) = _OrderDto;

  factory OrderDto.fromJson(Map<String, dynamic> json) =>
      _$OrderDtoFromJson(json);
}
```

## Anti-Patterns

- ❌ `jsonDecode(response.body)` — use Retrofit's generated mappers, never manual JSON parsing
- ❌ Static global `Dio` instance — inject Dio via DI; avoid global singletons
- ❌ `try-catch` inside Retrofit interface methods — let the repository layer handle exceptions
- ❌ Enum fields without `unknownEnumValue` — new backend values will crash the app

## Reference & Examples

For RestClient definitions and Auth Interceptor implementation:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

feature-based-clean-architecture | error-handling
