Put `[weak self]` at the beginning of an escaping closure's capture list when the closure is retained by `self` or should not keep `self` alive:

```swift
service.fetch { [weak self] result in
    guard let self else { return }
    self.apply(result)
}
```

The weak capture prevents a cycle and turns `self` into an optional. Use `guard let self` when the whole closure needs the object, or optional chaining (`self?.apply(result)`) for a single operation. Do not use `unowned` unless the lifetime is guaranteed.


