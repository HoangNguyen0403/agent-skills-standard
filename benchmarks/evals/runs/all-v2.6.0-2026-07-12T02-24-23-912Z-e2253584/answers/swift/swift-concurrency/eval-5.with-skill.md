Use `withThrowingTaskGroup` when the number of child tasks is determined at runtime:

```swift
func loadAll(_ urls: [URL]) async throws -> [Data] {
    try await withThrowingTaskGroup(of: Data.self, returning: [Data].self) { group in
        for url in urls {
            group.addTask {
                let (data, _) = try await URLSession.shared.data(from: url)
                try Task.checkCancellation()
                return data
            }
        }

        var result: [Data] = []
        for try await data in group { result.append(data) }
        return result
    }
}
```

Child tasks are structured under the group, and thrown errors or cancellation are propagated. Use `withTaskGroup` when children cannot throw, and avoid detached tasks unless you intentionally need independent lifetime and isolation.


