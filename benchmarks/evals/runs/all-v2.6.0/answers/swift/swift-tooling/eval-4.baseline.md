Write symbol documentation with `///` comments (or `/** ... */`) immediately before the declaration. DocC uses Markdown plus structured list fields for parameters, return values, and errors:

```swift
/// Loads a user from the service.
///
/// - Parameter id: The user's identifier.
/// - Returns: The decoded user.
/// - Throws: `NetworkError` when the request or decoding fails.
func loadUser(id: UUID) async throws -> User { /* ... */ }
```

Use headings, links, code spans, notes, and articles/tutorials where they clarify the public API. Keep comments accurate and focused on behavior and contracts. Xcode can build a DocC archive with Product > Build Documentation; Swift packages can use `swift package generate-documentation` (with the relevant DocC tooling) to generate documentation from public symbols.

