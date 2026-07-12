Use `async let` when a fixed set of independent asynchronous operations can run in parallel:

```swift
func loadDashboard() async throws -> Dashboard {
    async let profile = fetchProfile()
    async let notifications = fetchNotifications()
    async let recommendations = fetchRecommendations()

    return try await Dashboard(
        profile: profile,
        notifications: notifications,
        recommendations: recommendations
    )
}
```

The values begin concurrently and are awaited when read. Errors and cancellation still propagate through the structured task scope; use a task group instead when the number of child tasks is dynamic.


