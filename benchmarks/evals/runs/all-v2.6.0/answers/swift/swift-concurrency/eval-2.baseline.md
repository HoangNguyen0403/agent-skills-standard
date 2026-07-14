Use an actor to own the mutable state and expose only actor-isolated methods:

```swift
actor Counter {
    private var value = 0

    func increment() {
        value += 1
    }

    func currentValue() -> Int {
        value
    }
}

let counter = Counter()

await counter.increment()
let value = await counter.currentValue()
```

Actors serialize access to their isolated state, so concurrent tasks cannot mutate `value` simultaneously. Calls from outside the actor require `await`.

Keep mutable properties `private`, avoid returning mutable reference types, and use `Sendable` values when transferring data across actor boundaries. Use `nonisolated` only for methods that do not access actor-protected state.
