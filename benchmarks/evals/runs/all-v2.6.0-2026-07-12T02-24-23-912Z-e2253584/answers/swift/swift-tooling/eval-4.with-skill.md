Write public API documentation with triple-slash comments so DocC can use it:

```swift
/// Loads a user from the configured service.
///
/// - Returns: The decoded user.
/// - Throws: `NetworkError` when the request or response is invalid.
public func loadUser() async throws -> User {
    ...
}
```

Use clear summaries, parameter and return descriptions, and typed `- Throws:` documentation. DocC-compatible comments belong on public declarations, and the generated documentation should be built as part of the package or framework documentation workflow.


