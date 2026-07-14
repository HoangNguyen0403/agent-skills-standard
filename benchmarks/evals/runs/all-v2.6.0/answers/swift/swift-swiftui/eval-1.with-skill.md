Use `@State` when the view owns and manages the data, such as a toggle or text input. Keep it `private`.

```swift
struct SettingsView: View {
    @State private var isEnabled = false

    var body: some View {
        Toggle("Enabled", isOn: $isEnabled)
    }
}
```

Use `@Binding` when data is owned by a parent but passed down to a child that needs two-way access.

```swift
struct ParentView: View {
    @State private var isEnabled = false

    var body: some View {
        SettingsRow(isEnabled: $isEnabled)
    }
}

struct SettingsRow: View {
    @Binding var isEnabled: Bool

    var body: some View {
        Toggle("Enabled", isOn: $isEnabled)
    }
}
```

Rule of thumb: `@State` = data owned by this view; `@Binding` = data passed down from a parent.

For other ownership cases, use `@StateObject` when the view creates the object, `@ObservedObject` when receiving an external instance, and `@EnvironmentObject` to inject shared data into the view’s hierarchy via `.environmentObject()`.
