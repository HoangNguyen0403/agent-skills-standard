Use typed errors, mark recoverable failures with `throws`, and handle them with specific `do-catch` clauses:

```swift
enum LoginError: Error { case invalidCredentials, lockedOut }

func login() throws -> Session {
    guard credentialsAreValid else { throw LoginError.invalidCredentials }
    return Session()
}

do {
    let session = try login()
    show(session)
} catch LoginError.invalidCredentials {
    showMessage("Check your credentials")
} catch {
    showMessage("Could not sign in")
}
```

Propagate errors with `throws` when the caller can decide what to do. Use `try?` only when losing the error and receiving `nil` is acceptable; map domain errors to user-facing messages at the presentation layer.


