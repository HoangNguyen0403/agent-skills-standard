Annotate a function, property, or type with `@MainActor` when it must run on the main actor, such as UI state and view-model updates.

```swift
@MainActor
final class ProfileViewModel: ObservableObject {
    @Published private(set) var name = ""

    func apply(_ profile: Profile) {
        name = profile.name
    }
}
```

You can also annotate one function or closure: `Task { @MainActor in ... }`. Calling a main-actor-isolated member from another concurrency domain may require `await`; do the background work first and hop to the main actor only for UI-affecting work. Avoid using `DispatchQueue.main` as a substitute for correctly expressing isolation.

