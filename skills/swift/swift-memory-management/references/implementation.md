# Memory Management Implementation

## Weak vs Unowned

```swift
// ✅ GOOD: Weak for delegates
protocol DataSourceDelegate: AnyObject {
    func didUpdate()
}

class DataSource {
    weak var delegate: DataSourceDelegate?
}

// ✅ GOOD: Weak in closures
class ViewController {
    var onComplete: (() -> Void)?

    func loadData() {
        api.fetch { [weak self] result in
            guard let self = self else { return }
            self.handle(result)
        }
    }
}
```

```swift
// ❌ AVOID: Strong delegate (retain cycle)
class DataSource {
    var delegate: DataSourceDelegate? // Strong!
}

// ❌ AVOID: No capture list
func loadData() {
    api.fetch { result in
        self.handle(result) // Retain cycle if closure stored
    }
}
```

## Common Retain Cycles

### Parent-Child

```swift
class Parent {
    var child: Child?
}

class Child {
    weak var parent: Parent? // ✅ Must be weak
}
```

### Closure Property

```swift
class Service {
    var completion: (() -> Void)?

    func execute() {
        completion = { [weak self] in
            self?.finish() // ✅ Weak prevents cycle
        }
    }
}
```

## Debugging Memory Issues

```swift
class TrackedObject {
    deinit {
        print("TrackedObject deallocated") // Verify deallocation
    }
}
```

Use Xcode Instruments (Leaks, Allocations) to detect retain cycles.
