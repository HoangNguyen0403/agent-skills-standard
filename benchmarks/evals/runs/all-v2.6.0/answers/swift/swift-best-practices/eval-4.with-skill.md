Name Boolean properties as questions or capabilities, usually with `is`, `has`, or `can`:

```swift
struct Account {
    let isVerified: Bool
    let hasPremiumAccess: Bool
    let canDelete: Bool
}
```

This makes call sites read naturally (`if account.isVerified`). Follow Swift API Design Guidelines and use camelCase for properties.


