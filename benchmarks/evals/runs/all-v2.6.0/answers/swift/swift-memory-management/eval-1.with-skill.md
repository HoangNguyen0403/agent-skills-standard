To avoid a retain cycle in Swift:

- Use `weak` when a reference can become `nil`, such as delegates or optional parent references.
- Use `unowned` only when the referenced object is guaranteed to outlive the referring object; otherwise prefer `weak`.
- For escaping closures, put `[weak self]` at the beginning of the closure’s capture list:

```swift
class ViewModel {
    var onUpdate: (() -> Void)?

    func configure() {
        onUpdate = { [weak self] in
            guard let self else { return }
            self.refresh()
        }
    }

    func refresh() {}
}
```

- Declare delegates as weak, and make the protocol inherit from `AnyObject`:

```swift
protocol MyDelegate: AnyObject {
    func didUpdate()
}

class Controller {
    weak var delegate: MyDelegate?
}
```

- For multiple references, capture each weakly when needed:

```swift
{ [weak self, weak delegate] in
    self?.update()
    delegate?.didUpdate()
}
```

- In two-way object relationships, make one side `weak`:

```swift
class Parent {
    var child: Child?
}

class Child {
    weak var parent: Parent?
}
```

Structs are copied by value, so they generally do not need a capture list for `self`. Strong references are the default under ARC, so explicitly choose `weak` or `unowned` wherever ownership could form a retain cycle.
