---
name: android-networking
description: "Standards for Retrofit, OkHttp, and API Communication. Use when integrating Retrofit, OkHttp, or API clients in Android apps. (triggers: **/*Api.kt, **/*Service.kt, **/*Client.kt, Retrofit, OkHttpClient, @GET, @POST)"
---

# Android Networking Standards

## **Priority: P0**

## Implementation Guidelines

### Libraries

- **Client**: Retrofit 2 + OkHttp 4.
- **Serialization**: Kotlinx Serialization (Preferred over Moshi/Gson).
- **Format**: JSON. Use `@SerialName` for field mapping.

### Best Practices

- **Interceptors**: Use for Auth Headers (Bearer Token) and Logging (`HttpLoggingInterceptor`).
- **Response Handling**: Wrap responses in a `Result` type (Success/Error/Loading) in Repository/DataSource, NOT in the API interface.
- **Threads**: API calls must be `suspend` functions.

## Anti-Patterns

- **No Blocking Network Calls**: All API functions must be suspend.
- **No Logic in API Interface**: Only declare endpoints — handle errors in Repository.
- **No Raw Converter Factory**: Explicitly set "application/json" MediaType with kotlinx.serialization.

## References

- [Setup & Wrappers](references/implementation.md)
