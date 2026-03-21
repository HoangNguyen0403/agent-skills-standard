---
name: android-networking
description: 'Standards for Retrofit, OkHttp, and API Communication. Use when integrating Retrofit, OkHttp, or API clients in Android apps. (triggers: **/*Api.kt, **/*Service.kt, **/*Client.kt, Retrofit, OkHttpClient, @GET, @POST)'
---

# Android Networking Standards

## **Priority: P0**

## Implementation Guidelines

### Libraries & Setup

- **Client**: Use **Retrofit 2** with **OkHttp 4** for all backend communication.
- **Serialization**: Use **Kotlinx Serialization** (preferred). Use **`@SerialName`** for JSON field mapping.
- **Security**: Implement **Certificate Pinning** for sensitive production domains. Use **`NetworkSecurityConfig`** for cleartext traffic control.

### Network Ops

- **Interceptors**: Use **OkHttp Interceptors** for global concerns like **`Bearer token`** injection via the **`Authorization` header** and **`HttpLoggingInterceptor`** (debug only).
- **Architecture**: All API calls must be **`suspend` functions**. Use a **`Result` wrapper** or **`Either`** to handle success/failure in the Repository layer.
- **Minification**: Ensure **`isMinifyEnabled`** is true in `build.gradle` and define **R8/ProGuard rules** for Retrofit/OkHttp to prevent runtime crashes.
- **Testing**: Use **MockWebServer** to simulate API responses in unit and integration tests. Ensure **100% test coverage** for error cases (500, 401, 403).

## Anti-Patterns

- **No Blocking Network Calls**: All API functions must be suspend.
- **No Logic in API Interface**: Only declare endpoints — handle errors in Repository.
- **No Raw Converter Factory**: Explicitly set "application/json" MediaType with kotlinx.serialization.

## References

- [Setup & Wrappers](references/implementation.md)
