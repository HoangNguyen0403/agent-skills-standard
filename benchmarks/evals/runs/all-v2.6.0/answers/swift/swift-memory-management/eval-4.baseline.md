Assuming Swift, make the delegate reference `weak` so it doesn’t retain its owner:

```swift
protocol NetworkManagerDelegate: AnyObject {
    func networkManagerDidFinish(_ manager: NetworkManager)
}

final class NetworkManager {
    weak var delegate: NetworkManagerDelegate?

    func finish() {
        delegate?.networkManagerDidFinish(self)
    }
}

final class ViewController: UIViewController, NetworkManagerDelegate {
    private let manager = NetworkManager()

    override func viewDidLoad() {
        super.viewDidLoad()
        manager.delegate = self
    }

    func networkManagerDidFinish(_ manager: NetworkManager) {
        // Handle completion
    }
}
```

`AnyObject` is required because only class instances can be held weakly.

The ownership graph is:

```text
ViewController ─strong→ NetworkManager
ViewController ←weak── NetworkManager
```

Also avoid capturing the delegate-owning object strongly in callbacks:

```swift
manager.start { [weak self] result in
    self?.handle(result)
}
```

Use `unowned` only when the referenced object is guaranteed to outlive the closure; otherwise, `weak` is safer.
