Retain cycles occur when two objects hold strong references to each other, preventing ARC from deallocating them.

Use:

- `weak` for relationships where the referenced object may disappear, such as delegates:

```swift
protocol ViewControllerDelegate: AnyObject {}

class ViewController {
    weak var delegate: ViewControllerDelegate?
}
```

- `unowned` when the referenced object is guaranteed to outlive the owner:

```swift
class Customer {
    var card: CreditCard?
}

class CreditCard {
    unowned let customer: Customer

    init(customer: Customer) {
        self.customer = customer
    }
}
```

- Capture lists for closures that capture `self`:

```swift
class ViewModel {
    var onUpdate: (() -> Void)?

    func configure() {
        onUpdate = { [weak self] in
            self?.refresh()
        }
    }
}
```

Use `[unowned self]` only when `self` is guaranteed to exist for the closure’s entire lifetime.

Also invalidate timers, remove notification observers, and clear long-lived closure properties when they are no longer needed:

```swift
onUpdate = nil
timer?.invalidate()
```

Prefer `weak` when ownership is optional; use `unowned` only when the lifetime relationship is certain.
