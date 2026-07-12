Use an `actor` to isolate shared mutable state. Calls that cross the actor boundary are asynchronous:

```swift
actor ImageCache {
    private var values: [URL: Data] = [:]

    func insert(_ data: Data, for url: URL) {
        values[url] = data
    }

    func value(for url: URL) -> Data? {
        values[url]
    }
}

let cache = ImageCache()
Task {
    if let data = await cache.value(for: url) { print(data.count) }
}
```

Keep accesses to actor-isolated state inside actor methods. Use `nonisolated` only for methods that do not read or mutate that state, and avoid `Task.detached` unless breaking inherited isolation is intentional.


