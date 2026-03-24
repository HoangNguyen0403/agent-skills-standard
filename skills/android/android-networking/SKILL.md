---
name: android-networking
description: "Integrate Retrofit, OkHttp, and Kotlinx Serialization for type-safe API communication in Android. Use when building API clients, adding interceptors, or configuring network security. (triggers: **/*Api.kt, **/*Service.kt, **/*Client.kt, Retrofit, OkHttpClient, @GET, @POST)"
---

# Android Networking Standards

## **Priority: P0**

## 1. Configure the HTTP Stack

- Use **Retrofit 2** with **OkHttp 4** for all backend communication.
- Use **Kotlinx Serialization** with `@SerialName` for JSON field mapping.
- Implement **Certificate Pinning** for sensitive production domains.

```kotlin
@Serializable
data class UserDto(
    @SerialName("user_id") val userId: String,
    @SerialName("display_name") val displayName: String
)
```

## 2. Define API Endpoints

- All API calls must be `suspend` functions.
- Declare endpoints only in the API interface — handle errors in Repository.

```kotlin
interface UserApi {
    @GET("users/{id}")
    suspend fun getUser(@Path("id") id: String): UserDto

    @POST("users")
    suspend fun createUser(@Body request: CreateUserRequest): UserDto
}
```

## 3. Add Cross-Cutting Concerns

- Use OkHttp Interceptors for `Bearer token` injection and `HttpLoggingInterceptor` (debug only).
- Wrap responses with a `Result` wrapper or `Either` in the Repository layer.
- Define R8/ProGuard rules for Retrofit/OkHttp when `isMinifyEnabled = true`.
- Use **MockWebServer** for unit/integration tests — cover 500, 401, 403 error cases.

## Anti-Patterns

- **No Blocking Network Calls**: All API functions must be suspend.
- **No Logic in API Interface**: Only declare endpoints — handle errors in Repository.
- **No Raw Converter Factory**: Explicitly set "application/json" MediaType with kotlinx.serialization.

## References

- [Setup & Wrappers](references/implementation.md)
