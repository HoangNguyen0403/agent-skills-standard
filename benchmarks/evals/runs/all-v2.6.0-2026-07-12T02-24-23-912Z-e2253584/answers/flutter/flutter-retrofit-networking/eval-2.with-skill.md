Use a Dio auth interceptor and handle refresh in `onError` when the response is `401`.

The usual flow is:

1. Add the access token in `onRequest`
2. If a request fails with `401`, pause or serialize retries
3. Call `refreshToken()` with your refresh token
4. Save the new access token
5. Clone and retry the original request with the updated `Authorization` header
6. If refresh also fails, clear auth state and force logout

Example:

```dart
class AuthInterceptor extends Interceptor {
  AuthInterceptor({
    required this.dio,
    required this.tokenStore,
    required this.refreshToken,
  });

  final Dio dio;
  final TokenStore tokenStore;
  final Future<String> Function() refreshToken;

  bool _isRefreshing = false;
  final List<RequestOptions> _pendingRequests = [];

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) async {
    final token = await tokenStore.getAccessToken();
    if (token != null) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode != 401) {
      return handler.next(err);
    }

    final request = err.requestOptions;

    if (_isRefreshing) {
      _pendingRequests.add(request);
      return;
    }

    _isRefreshing = true;

    try {
      final newAccessToken = await refreshToken();
      await tokenStore.saveAccessToken(newAccessToken);

      request.headers['Authorization'] = 'Bearer $newAccessToken';
      final retryResponse = await dio.fetch(request);

      for (final pending in _pendingRequests) {
        pending.headers['Authorization'] = 'Bearer $newAccessToken';
        dio.fetch(pending);
      }
      _pendingRequests.clear();

      handler.resolve(retryResponse);
    } catch (_) {
      _pendingRequests.clear();
      await tokenStore.clear();
      handler.next(err);
    } finally {
      _isRefreshing = false;
    }
  }
}
```

If you use Retrofit, keep refresh logic in the Dio interceptor, and inject that configured `Dio` into your `RestClient`.

Important details:

- Do not create a global Dio singleton manually; inject it through DI
- Retry with `dio.fetch(err.requestOptions)` after updating the token
- Prevent multiple simultaneous refresh calls
- If your backend can add new enum values in auth/profile payloads, protect DTO enums with `@JsonKey(unknownEnumValue: ...)`
- Map `DioException` to typed failures in the repository layer

