Use a task group for a dynamic collection of child tasks and collect their results as they finish.

```swift
func fetchAll(_ ids: [UUID]) async throws -> [User] {
    try await withThrowingTaskGroup(of: User.self, returning: [User].self) { group in
        for id in ids {
            group.addTask {
                try await fetchUser(id: id)
            }
        }

        var users: [User] = []
        for try await user in group {
            users.append(user)
        }
        return users
    }
}
```

Child tasks inherit structured-concurrency relationships, and a thrown error cancels the remaining group work. Consider limiting concurrency for very large inputs and make values crossing task boundaries `Sendable`. Results arrive in completion order, not input order, unless you add indexing and reorder them.

