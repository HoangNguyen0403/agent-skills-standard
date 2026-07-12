Use `guard` when a condition must hold for the rest of the function. Its `else` block must exit the current scope:

```swift
func displayName(for user: User?) -> String {
    guard let user else { return "Anonymous" }
    guard !user.name.isEmpty else { return "Unnamed" }
    return user.name
}
```

This keeps the happy path unindented and makes precondition failures explicit. Prefer it to deeply nested `if let` statements; use `if let` when the optional value is needed only in a small branch.


