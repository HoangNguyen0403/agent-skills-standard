Use `weak` when the reference may become `nil` while the referring object exists. It is optional and safe:

```swift
protocol MyDelegate: AnyObject {}

weak var delegate: MyDelegate?
```

Use `unowned` only when the referenced object is guaranteed to outlive the referring object. It is non-optional, but accessing it after deallocation crashes. This is rare; prefer `weak` unless the lifetime guarantee is certain.

For escaping closures that could create a retain cycle, put the capture at the beginning of the closure’s capture list:

```swift
someOperation { [weak self] in
    guard let self = self else { return }
    self.updateUI()
}
```

Use `[unowned self]` only when the closure cannot run after `self` is deallocated:

```swift
someOperation { [unowned self] in
    self.updateUI()
}
```

Rule of thumb: `weak` if it can become `nil`; `unowned` if it is guaranteed to remain alive.
