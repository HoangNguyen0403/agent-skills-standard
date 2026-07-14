Declare the conformance in an extension, then implement the protocol requirements there:

```swift
struct User {
    let id: UUID
}

extension User: Identifiable {}
```

For a protocol with requirements, provide the implementation in the same extension:

```swift
protocol Displayable {
    var displayText: String { get }
}

extension User: Displayable {
    var displayText: String { id.uuidString }
}
```

Separating conformances keeps the primary type focused and makes protocol responsibilities easy to find. Extensions cannot add stored properties, but they can add computed properties, methods, and protocol conformance.

