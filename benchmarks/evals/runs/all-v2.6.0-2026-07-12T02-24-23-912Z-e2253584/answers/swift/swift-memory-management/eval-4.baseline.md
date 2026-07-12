Make the delegate protocol class-bound and store the delegate weakly:

```swift
protocol PlayerDelegate: AnyObject {
    func playerDidFinish(_ player: Player)
}

final class Player {
    weak var delegate: PlayerDelegate?

    func finish() {
        delegate?.playerDidFinish(self)
    }
}
```

The owner can retain the `Player` strongly, while `Player` does not retain its delegate, so the common owner–delegate cycle is avoided. The delegate must be optional because it can disappear; use a strong delegate only when the relationship is explicitly owning.

