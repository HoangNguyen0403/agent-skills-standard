Use `guard` when a condition must be true for the rest of the current scope. Its `else` block must leave that scope with `return`, `throw`, `break`, or `continue`; values introduced by a successful guard remain available afterward.

```swift
func displayName(for user: User?) -> String {
    guard let user, !user.name.isEmpty else {
        return "Anonymous"
    }
    return user.name
}
```

This keeps the main path unindented and is useful for validating inputs, optionals, and preconditions at the top of a function or loop.

