`TaskGroup` lets you run multiple child tasks concurrently and collect their results. Use `withTaskGroup` for non-throwing tasks and `withThrowingTaskGroup` when tasks may fail.

```swift
func fetchAll(ids: [Int]) async -> [String] {
    await withTaskGroup(of: String.self, returning: [String].self) { group in
        for id in ids {
            group.addTask {
                await fetchName(for: id)
            }
        }

        var results: [String] = []

        for await result in group {
            results.append(result)
        }

        return results
    }
}
```

Results arrive in completion order, not necessarily the same order as `ids`.

For throwing tasks:

```swift
func fetchAll(ids: [Int]) async throws -> [String] {
    try await withThrowingTaskGroup(
        of: String.self,
        returning: [String].self
    ) { group in
        for id in ids {
            group.addTask {
                try await fetchName(for: id)
            }
        }

        var results: [String] = []

        while let result = try await group.next() {
            results.append(result)
        }

        return results
    }
}
```

Useful APIs:

- `group.addTask { ... }` — adds a child task.
- `group.addTaskUnlessCancelled { ... }` — adds a task only if the group is not cancelled.
- `group.next()` — waits for and returns the next completed result; throws for a throwing group.
- `group.cancelAll()` — cancels remaining child tasks.
- `Task.isCancelled` or `try Task.checkCancellation()` — lets child tasks respond to cancellation.

Child tasks are automatically awaited before the task-group scope exits. A `TaskGroup` itself cannot be returned; return its collected results instead.
