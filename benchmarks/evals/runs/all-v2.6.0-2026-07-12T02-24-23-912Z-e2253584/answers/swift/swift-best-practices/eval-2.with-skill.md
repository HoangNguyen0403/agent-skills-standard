Default to a `struct` when the value has value semantics and does not need shared identity or inheritance:

```swift
struct User {
    let id: UUID
    let name: String
}
```

Use a `class` when instances must have shared reference identity, participate in an object lifecycle, or use inheritance. Make non-subclassable classes `final`, and prefer `let` properties unless mutation is required. Structs are generally easier to reason about and safer to share across concurrent code.


