Prefer a `struct` for a value type with independent copies and no need for identity or inheritance:

```swift
struct Point { var x: Double; var y: Double }
```

Use a `class` when instances must be shared by reference, have identity or lifecycle semantics, or require inheritance:

```swift
final class Session { var token: String; init(token: String) { self.token = token } }
```

Structs are copied on assignment; class instances are shared. Keep properties immutable with `let` when possible and mark non-subclassable classes `final`.


