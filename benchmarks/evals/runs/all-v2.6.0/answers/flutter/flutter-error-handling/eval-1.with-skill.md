Handle it in the infrastructure/repository layer: map the `DioException` with status 401 to a typed `UnauthorizedFailure`, log it using a stable template, and return `Left` rather than throwing.

```dart
Future<Either<AuthFailure, User>> getCurrentUser() async {
  try {
    final dto = await _api.getCurrentUser();
    return Right(dto.toDomain());
  } on DioException catch (e, st) {
    AppLogger.error(
      'getCurrentUser request failed',
      error: e,
      stackTrace: st,
    );

    if (e.response?.statusCode == 401) {
      return const Left(AuthFailure.unauthorized());
    }
    return const Left(AuthFailure.serverError());
  }
}
```

The BLoC should receive the `Either` and use `fold`; it should not catch the `DioException` itself.

