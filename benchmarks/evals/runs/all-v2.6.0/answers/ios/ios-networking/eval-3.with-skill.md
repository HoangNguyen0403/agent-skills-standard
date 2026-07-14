Common iOS networking anti-patterns to avoid:

- Building URLs with string interpolation instead of `URLComponents` and `URLQueryItem`
- Doing JSON parsing manually with `JSONSerialization` when `Codable` is safer and cleaner
- Skipping timeout configuration and letting requests hang too long
- Updating UI from background threads instead of hopping back to the main actor
- Scattering networking code across view controllers instead of keeping a dedicated client/service layer
- Ignoring HTTP status codes and treating every response as success
- Not centralizing auth headers and token refresh logic
- Retrying blindly without handling `401` or refresh failures correctly
- Hardcoding secrets or tokens in requests
- Not validating TLS properly in production, especially for sensitive APIs

In practice, a good default is `URLSession` with async/await, `Codable` for decoding, safe URL construction with `URLComponents`, and a single networking layer that owns auth, retries, errors, and timeouts.

