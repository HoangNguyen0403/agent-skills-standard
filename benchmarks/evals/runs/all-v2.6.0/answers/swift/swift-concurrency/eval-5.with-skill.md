Use `withTaskGroup` for a dynamic number of child tasks. The closure is `async`, and results are consumed with `for await`:

```swift
func fetchAll(ids: [Int]) async -> [String] {
    await withTaskGroup(of: String?.self, returning: [String].self) { group in
        for id in ids {
            group.addTask {
                try? await fetchName(for: id)
            }
        }

        var names: [String] = []
        for await name in group {
            if let name {
                names.append(name)
            }
        }
        return names
    }
}
```

For operations that can fail, use `withThrowingTaskGroup` and handle cancellation:

```swift
func fetchAll(ids: [Int]) async throws -> [String] {
    try await withThrowingTaskGroup(of: String.self, returning: [String].self) { group in
        for id in ids {
            group.addTask {
                try Task.checkCancellation()
                return try await fetchName(for: id)
            }
        }

        var names: [String] = []

        do {
            for try await name in group {
                names.append(name)
            }
            return names
        } catch is CancellationError {
            group.cancelAll()
            throw CancellationError()
        } catch {
            group.cancelAll()
            throw error
        }
    }
}
```

Call the function from an asynchronous context:

```swift
let names = try await fetchAll(ids: [1, 2, 3])
```

Task-group children are structured and remain within the parent task’s hierarchy. Use `group.cancelAll()` when one failure or cancellation should stop remaining work, and check `Task.isCancelled` or call `try Task.checkCancellation()` inside long-running loops.

For a fixed, small number of independent tasks, `async let` is usually simpler:

```swift
async let first = fetchName(for: 1)
async let second = fetchName(for: 2)

let names = try await [first, second]
```

If child tasks share mutable state, isolate that state in an `actor`. For UI updates, keep the UI type `@MainActor` or use `MainActor.run { ... }`; avoid blocking the main actor with synchronous work.
