Use `fatalError` only for an unrecoverable programmer error or an invariant that should be unreachable, such as a required implementation that is intentionally absent. It is not appropriate for expected input, network, or user errors.

```swift
func makeRequiredService() -> Service {
    fatalError("Service must be provided by dependency injection")
}
```

Prefer typed `throws` for recoverable failures, and `precondition`, `assert`, or `assertionFailure` when expressing programmer assumptions. Keep `Never` for functions that cannot return, such as a deliberate fatal termination.


