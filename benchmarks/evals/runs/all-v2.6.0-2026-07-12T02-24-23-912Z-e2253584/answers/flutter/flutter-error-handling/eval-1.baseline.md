Handle a `401 Unauthorized` as an expected application error, not as a generic crash.

At a practical level:

- Catch `DioException`, not just `Exception`.
- Check the HTTP status code with `e.response?.statusCode`.
- If it is `401`, convert it into an auth-specific failure such as `UnauthorizedFailure`, trigger logout or token refresh if your app supports it, and show a clear message like “Your session expired. Please sign in again.”
- For other network cases, map them separately: timeout, no internet, server error, malformed response, and unknown error.

Example:

```dart
try {
  final response = await dio.get('/profile');
  return User.fromJson(response.data);
} on DioException catch (e) {
  final statusCode = e.response?.statusCode;

  if (statusCode == 401) {
    throw UnauthorizedFailure(
      message: 'Your session expired. Please sign in again.',
    );
  }

  if (e.type == DioExceptionType.connectionTimeout ||
      e.type == DioExceptionType.receiveTimeout) {
    throw NetworkFailure(message: 'Request timed out. Please try again.');
  }

  throw ApiFailure(message: 'Something went wrong while contacting the server.');
}
```

In UI/state-management terms, do not expose raw Dio errors directly to widgets. Translate them in the data or repository layer into domain-friendly failures, then let the BLoC emit a state the UI can render predictably.

That gives you:

- consistent behavior for auth failures
- cleaner user messages
- easier testing
- no leakage of transport-layer details into presentation code

