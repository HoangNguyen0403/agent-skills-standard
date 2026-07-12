Make the delegate protocol class-bound and the delegate property weak so the owner and delegate do not retain each other:

```swift
protocol PlayerDelegate: AnyObject {
    func playerDidFinish()
}

final class Player {
    weak var delegate: PlayerDelegate?

    func finish() {
        delegate?.playerDidFinish()
    }
}
```

Use `weak` for optional parent/delegate references and avoid strong closure captures of the owner (`[weak self]`).


