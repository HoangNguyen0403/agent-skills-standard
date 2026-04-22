---
name: ios-networking
description: Build API clients with URLSession, Alamofire, and Codable. Use when implementing URLSession networking, Alamofire, or API clients in iOS.
metadata:
  triggers:
    files:
    - '**/*Service.swift'
    - '**/*API.swift'
    - '**/*Client.swift'
    keywords:
    - URLSession
    - Alamofire
    - Moya
    - URLRequest
    - URLComponents
    - Codable
---
# iOS Networking

## **Priority: P0**

## Implementation Workflow

1. **Choose networking layer** — Use native `URLSession` with async/await for simple apps; `Alamofire` for production APIs with interceptors.
2. **Build URLs safely** — Use `URLComponents` and `URLQueryItem`; never use string interpolation for URL parameters.
3. **Decode with Codable** — Use `Codable` for all JSON mapping. Prefer `snake_case` key decoding strategies.
4. **Add auth interceptor** — Use `RequestInterceptor` to inject `Authorization: Bearer <token>` on all requests.
5. **Handle token refresh** — On 401, use `RequestInterceptor.onRetry` to call `refreshToken()` and retry.
6. **Pin certificates** — Use `ServerTrustManager` or `TrustKit` for production-grade security.

See [URLSession and Alamofire implementation examples](references/implementation.md)

## Anti-Patterns

- **No Background UI Updates**: Always dispatch to `@MainActor` or main queue
- **No Manual `JSONSerialization`**: Use `Codable` and `JSONDecoder`
- **No Missing Timeouts**: Set reasonable `timeoutInterval` (30s default)

## References

- [Native & Alamofire Implementation](references/implementation.md)