An actor serializes access to its isolated mutable state, preventing data races when that state is used concurrently.

```swift
actor DownloadCounter {
    private var count = 0

    func increment() { count += 1 }
    func value() -> Int { count }
}

let counter = DownloadCounter()
Task {
    await counter.increment()
    let total = await counter.value()
    print(total)
}
```

Calls that cross the actor boundary are normally asynchronous and require `await`. Keep state private, use `nonisolated` only for members that do not access isolated state, and ensure values passed between concurrent contexts meet Swift's `Sendable` requirements.

