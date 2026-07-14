Declare operations that can fail with `throws`, propagate failures with `try`, and handle them with `do`/`catch`.

```swift
enum LoginError: Error { case invalidCredentials }

func login() throws -> Session { /* ... */ }

do {
    let session = try login()
    print(session)
} catch LoginError.invalidCredentials {
    print("Check your credentials")
} catch {
    print("Unexpected error: \(error)")
}
```

Use `try?` when failure can intentionally become `nil`, and reserve `try!` for a genuinely guaranteed invariant. Use `defer` for cleanup that must happen on both success and failure. Preserve useful error context rather than catching and silently ignoring errors.

