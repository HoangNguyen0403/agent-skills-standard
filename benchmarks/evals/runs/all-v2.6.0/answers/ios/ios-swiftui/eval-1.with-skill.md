On iOS 17+, the rule of thumb depends on whether your view model uses the new `@Observable` system or the older `ObservableObject` pattern.

If your view model is `@Observable`:

- Use `@State` when the view owns and creates the view model.
- Use a plain stored property like `let viewModel: MyViewModel` when the parent passes it in.
- Do not use `@ObservedObject` or `@StateObject` for new `@Observable` models.

Example:

```swift
@Observable
final class ProfileViewModel {
    var name = "Huy"
}

struct ProfileView: View {
    @State private var viewModel = ProfileViewModel()

    var body: some View {
        Text(viewModel.name)
    }
}
```

If a child receives that same `@Observable` model:

```swift
struct ProfileNameView: View {
    let viewModel: ProfileViewModel

    var body: some View {
        Text(viewModel.name)
    }
}
```

If your view model is still using legacy `ObservableObject`:

- Use `@StateObject` when the view owns and creates it.
- Use `@ObservedObject` when the model is created elsewhere and injected into the view.

Example:

```swift
final class ProfileViewModel: ObservableObject {
    @Published var name = "Huy"
}

struct ProfileView: View {
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        Text(viewModel.name)
    }
}

struct ProfileNameView: View {
    @ObservedObject var viewModel: ProfileViewModel

    var body: some View {
        Text(viewModel.name)
    }
}
```

Short version:

- `@State`: local value state, and owned `@Observable` view models on iOS 17+
- `@StateObject`: owned legacy `ObservableObject` view models
- `@ObservedObject`: injected legacy `ObservableObject` view models

For new iOS 17+ code, prefer `@Observable` + `@State` in the owning view.

