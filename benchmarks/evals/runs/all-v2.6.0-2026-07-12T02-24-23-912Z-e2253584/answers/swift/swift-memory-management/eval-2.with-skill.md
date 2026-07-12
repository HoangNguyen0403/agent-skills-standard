Use `weak` when the referenced object may disappear first, such as a delegate or optional parent reference. A weak reference becomes `nil` and must be optional:

```swift
weak var delegate: AnyObject?
```

Use `unowned` only when the referenced object is guaranteed to outlive the holder; it is non-optional and will trap if that guarantee is false. Because that crash is unsafe, prefer `weak` unless the lifetime relationship is certain and enforced.


