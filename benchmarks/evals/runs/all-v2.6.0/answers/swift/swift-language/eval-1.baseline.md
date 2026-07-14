Unwrap an optional according to whether absence is expected:

```swift
if let name = optionalName {
    print(name)
}

guard let name = optionalName else {
    return
}
print(name)

let displayName = optionalName ?? "Anonymous"
let uppercased = optionalName?.uppercased()
```

Use `if let` for a local branch, `guard let` when the value is required for the rest of the scope, `??` for a default, and optional chaining for an optional result. Avoid `!` unless a checked invariant guarantees the value is present; otherwise a missing value will crash at runtime.

