Use `[weak self]` at the beginning of the closure’s capture list:

```swift
someAsyncOperation { [weak self] result in
    guard let self = self else { return }
    self.handle(result)
}
```

This prevents a retain cycle. Since `self` may become `nil`, you can also use optional chaining:

```swift
someAsyncOperation { [weak self] result in
    self?.handle(result)
}
```

Use `weak` if the reference can become nil. Use `unowned` only if `self` is guaranteed to outlive the closure; otherwise, `unowned` can crash. For delegates, use `weak var delegate` and constrain the protocol with `AnyObject`.
