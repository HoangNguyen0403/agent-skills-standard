---
name: ios-networking
description: 'Standards for URLSession, Alamofire, and API communication. Use when implementing URLSession networking, Alamofire, or API clients in iOS. (triggers: **/*Service.swift, **/*API.swift, **/*Client.swift, URLSession, Alamofire, Moya, URLRequest, URLComponents, Codable)'
---

# iOS Networking Standards

## **Priority: P0**

## Implementation Guidelines

### URLSession (Native)

- **Tasks**: Use `dataTaskPublisher` (Combine) or **async/await** (e.g., `let (data, response) = await URLSession.shared.data(...)`).
- **Configuration**: Use `URLSessionConfiguration.default` for standard tasks and `ephemeral` for private browsing/clearing cache.
- **Request Building**: Use **`URLComponents` and `URLQueryItem`** to build URLs safely with parameters. **Never use string interpolation** for URL parameters.

### Alamofire (Standard Third-Party)

- **Session**: Maintain a singleton or DI-injected `Session` instance.
- **Request**: Use **`.validate()`** to automatically check for **200..299** status codes.
- **Encoding**: Use `JSONParameterEncoder.default` for body parameters.
- **Retriers**: Handle a **401 token refresh** with a `RequestInterceptor`. Use `onRetry` to call the `refreshToken()` API.

### Best Practices

- **Codable**: Use **Codable** for all JSON decoding/mapping. Prefer `snake_case` strategies for API data consistency.
- **Bearer Token Auth**: Use **RequestInterceptor** to add the **Bearer header** (`Authorization: Bearer <token>`) to all API requests.
- **SSL Pinning**: Implement using **ServerTrustManager** or `TrustKit` for production-grade security.

## Anti-Patterns

- **No UI updates in background task**: Always dispatch to MainActor or main thread.
- **No manual JSONSerialization**: Use **Codable** and `JSONDecoder`.
- **No indefinite wait**: Set a reasonable timeoutInterval (30s default).

## References

- [Native & Alamofire Implementation](references/implementation.md)
