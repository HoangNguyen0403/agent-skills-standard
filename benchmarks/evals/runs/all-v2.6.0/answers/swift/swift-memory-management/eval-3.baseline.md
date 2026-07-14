In Swift, capture `self` weakly by adding `[weak self]` before the closure parameters:

```swift
someAsyncOperation { [weak self] result in
    guard let self else { return }

    self.handle(result)
}
```

Because weak `self` becomes optional, you can also use optional chaining:

```swift
button.onTap = { [weak self] in
    self?.handleTap()
}
```

Use `[weak self]` when the closure may outlive the object and retaining `self` could create a retain cycle, such as with timers, callbacks, or asynchronous APIs.

For older Swift versions:

```swift
someAsyncOperation { [weak self] result in
    guard let self = self else { return }

    self.handle(result)
}
```
