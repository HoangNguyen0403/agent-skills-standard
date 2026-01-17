# Retrofit & Dio Reference

Standards for API communication and networking logic.

## References

- [**RestClient Setup**](client-definition.md) - Standard Retrofit interface examples.
- [**Auth Interceptors**](auth-interceptor.md) - Handling Bearer tokens and Auth headers.
- [**Token Refresh Logic**](token-refresh.md) - The 401 Lock-Refresh-Retry pattern.

## **Quick Definition**

```dart
@RestApi()
abstract class ApiClient {
  @GET("/items")
  Future<List<ItemDto>> getItems(@Query("limit") int limit);
}
```
