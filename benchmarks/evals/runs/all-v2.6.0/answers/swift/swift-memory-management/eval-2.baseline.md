Use `weak` when the referenced object may be deallocated first.

- Does not retain the object.
- Automatically becomes `nil` when the object is deallocated.
- Must be optional: `weak var delegate: Delegate?`
- Best for delegates, parent references, and relationships where the reference is not required to exist.

Use `unowned` when the referenced object is guaranteed to outlive the reference.

- Does not retain the object.
- Is non-optional by default.
- Accessing it after deallocation causes a runtime crash.
- Common for tightly coupled objects, such as a child that always has a living parent, or closure captures where the owner must outlive the closure.

```swift
class Customer {
    var card: Card?
}

class Card {
    unowned let customer: Customer

    init(customer: Customer) {
        self.customer = customer
    }
}
```

Rule of thumb: choose `weak` when lifetime uncertainty is acceptable; choose `unowned` only when the lifetime guarantee is certain.
