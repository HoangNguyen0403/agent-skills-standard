# Token Refresh Pattern

When a `401 Unauthorized` error occurs, the networking layer should handle the refresh cycle transparently.

## **Implementation Flow (Dio Interceptor)**

```dart
class AuthInterceptor extends QueuedInterceptorsWrapper {
  final Dio dio;
  final SecureStorage storage;

  AuthInterceptor(this.dio, this.storage);

  @override
  void onError(DioException err, ErrorInterceptorHandler handler) async {
    if (err.response?.statusCode == 401) {
      // 1. Refresh the token
      final newToken = await _performRefresh();
      
      if (newToken != null) {
        // 2. Retry the original request with new token
        final options = err.requestOptions;
        options.headers['Authorization'] = 'Bearer $newToken';
        
        final response = await dio.fetch(options);
        return handler.resolve(response);
      }
    }
    return handler.next(err);
  }

  Future<String?> _performRefresh() async {
    // Logic to call refresh endpoint and update storage
  }
}
```

## **Why QueuedInterceptorsWrapper?**

Using `QueuedInterceptorsWrapper` ensures that if multiple requests trigger a 401 at the same time, they are queued while the first one performs the token refresh, preventing multiple redundant refresh calls.
