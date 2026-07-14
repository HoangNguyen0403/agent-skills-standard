Use a class-bound delegate protocol and make the delegate reference `weak`:

```swift
protocol MyDelegate: AnyObject {
    func didFinish()
}

final class Worker {
    weak var delegate: MyDelegate?

    func finish() {
        delegate?.didFinish()
    }
}
```

Because the delegate reference is weak, `Worker` does not retain its delegate, preventing a retain cycle. Use `weak` when the delegate can become `nil`; use `unowned` only if the delegate is guaranteed to outlive the referring object.

For closures stored as properties, capture `self` weakly at the beginning of the closure’s capture list:

```swift
final class Controller {
    let worker = Worker()

    func start() {
        worker.onComplete = { [weak self] in
            guard let self = self else { return }
            self.handleCompletion()
        }
    }

    private func handleCompletion() {}
}
```

For multiple references, use `[weak self, weak delegate]`.
