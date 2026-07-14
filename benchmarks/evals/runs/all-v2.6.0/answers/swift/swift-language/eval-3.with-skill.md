Declare protocol conformance in an extension to separate the type's main definition from the conformance implementation:

```swift
struct User {
    let id: UUID
}

protocol IdentifiableUser {
    var id: UUID { get }
}

extension User: IdentifiableUser {
    // All required members are implemented here or in the main type.
}
```

Extensions can add computed properties, methods, and conformance, but cannot add stored properties. Implement every required protocol member explicitly so the protocol witness is complete.


