Use `@MainActor` to ensure UI-related code runs on the main actor.

```swift
@MainActor
final class ViewModel {
    var title = "Loading"

    func updateTitle() {
        title = "Ready"
    }
}
```

Annotate individual members when only part of a type touches UI:

```swift
final class ViewController: UIViewController {
    @MainActor
    func showMessage(_ message: String) {
        title = message
    }

    @MainActor
    var statusText: String = ""
}
```

For closures:

```swift
Task { @MainActor in
    label.text = "Updated"
}
```

You can also annotate an entire UIKit or SwiftUI type:

```swift
@MainActor
struct ContentView: View {
    var body: some View {
        Text("Hello")
    }
}
```

From a non-main context, explicitly switch to the main actor:

```swift
await MainActor.run {
    label.text = "Updated"
}
```

Use `@MainActor` for UI state, view controllers, views, and methods that update UI elements.
