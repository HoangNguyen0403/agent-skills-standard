Capture `self` weakly when an escaping closure must not keep the object alive, for example in a callback retained by the object or by a long-lived service.

```swift
service.load { [weak self] result in
    guard let self else { return }
    self.handle(result)
}
```

For a short use, optional chaining is enough: `[weak self] result in self?.handle(result)`. The capture list is decided by ownership semantics, not habit: a closure that must keep its owner alive should capture strongly, while a weak capture requires handling the possibility that `self` is gone. Do not use weak capture to hide an unclear lifetime design.

