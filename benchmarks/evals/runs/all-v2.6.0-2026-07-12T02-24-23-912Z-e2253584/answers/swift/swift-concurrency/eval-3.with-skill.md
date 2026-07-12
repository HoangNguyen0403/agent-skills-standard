Annotate UI-owned types with `@MainActor` so their state and methods run on the main actor:

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published private(set) var name = ""

    func load() async throws {
        name = try await profileService.fetch().name
    }
}
```

For an isolated update from another context, use `await MainActor.run { ... }`. Keep network or CPU-heavy work asynchronous and off the main actor; do not block an `@MainActor` method with synchronous work.


