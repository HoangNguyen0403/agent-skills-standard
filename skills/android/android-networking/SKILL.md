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

See [setup & wrappers](references/implementation.md) for DTO and API examples.

## 2. Define API Endpoints

- All API calls must be `suspend` functions.
- Declare endpoints only in the API interface — handle errors in Repository.

See [setup & wrappers](references/implementation.md) for API endpoint definitions.

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
