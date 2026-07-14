Name Boolean properties as predicates that read naturally at the call site. Common prefixes are `is`, `has`, `can`, `should`, and `was`:

```swift
var isEnabled: Bool
var hasUnreadMessages: Bool
var canRetry: Bool
var shouldRefresh: Bool
```

Avoid vague names such as `status` for a Boolean and usually avoid a `get` prefix. A property should read as a statement, for example `if account.isVerified { ... }`.

