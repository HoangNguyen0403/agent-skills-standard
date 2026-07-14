Annotate UI types or members with `@MainActor`:

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var name = ""

    func load() async {
        let profile = await fetchProfile()
        name = profile.name
    }

    nonisolated func makeRequestID() -> UUID {
        UUID()
    }
}
```

For SwiftUI views:

```swift
@MainActor
struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        Text(viewModel.name)
            .task {
                await viewModel.load()
            }
    }
}
```

Use `@MainActor` on individual properties or methods when only part of a type updates UI:

```swift
final class Controller {
    @MainActor var title = ""

    @MainActor
    func updateTitle(_ value: String) {
        title = value
    }
}
```

From an async context that is not main-actor isolated, use:

```swift
await MainActor.run {
    viewModel.name = "Updated"
}
```

`Task { ... }` inherits the surrounding actor isolation, so a task created from `@MainActor` UI code remains main-actor isolated. Avoid `Task.detached` for UI work. Mark methods `nonisolated` only when they do not access actor-isolated state.

Keep synchronous work inside `@MainActor` short; never block the main thread. UI updates must not occur off `@MainActor`. Use `async`/`await` for asynchronous work and check or propagate cancellation in long-running tasks.
