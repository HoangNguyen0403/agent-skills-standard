# Functional Failure Patterns

## **Global Failures (@freezed)**

```dart
@freezed
class ApiFailure with _$ApiFailure {
  const factory ApiFailure.serverError() = _ServerError;
  const factory ApiFailure.networkError() = _NetworkError;
  const factory ApiFailure.unauthenticated() = _Unauthenticated;
  const factory ApiFailure.badRequest(String message) = _BadRequest;
}
```

## **Infrastructure Mapper**

```dart
extension DioErrorX on DioException {
  ApiFailure toFailure() {
    switch (type) {
      case DioExceptionType.connectionTimeout:
        return const ApiFailure.networkError();
      case DioExceptionType.badResponse:
        if (response?.statusCode == 401) return const ApiFailure.unauthenticated();
        return const ApiFailure.serverError();
      default:
        return const ApiFailure.serverError();
    }
  }
}
```
