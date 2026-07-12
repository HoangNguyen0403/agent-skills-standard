ARC uses strong references by default, so a retain cycle occurs when strongly referenced objects keep each other alive. Break one edge with `weak` or, only when lifetime is guaranteed, `unowned`.

```swift
final class Controller {
    var onUpdate: (() -> Void)?

    func configure() {
        onUpdate = { [weak self] in
            self?.refresh()
        }
    }

    func refresh() { }
}
```

Make delegate references weak, use capture lists for closures stored by an object they capture, and use `deinit` during testing to confirm expected release. Prefer `weak` when the reference may become `nil`.


