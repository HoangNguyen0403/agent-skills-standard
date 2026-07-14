Use `@State` when a view owns and manages its local mutable value.

```swift
struct CounterView: View {
    @State private var count = 0

    var body: some View {
        Button("Count: \(count)") {
            count += 1
        }
    }
}
```

Use `@Binding` when a view does not own the value but needs read/write access to state owned by another view.

```swift
struct ParentView: View {
    @State private var isOn = false

    var body: some View {
        ToggleView(isOn: $isOn)
    }
}

struct ToggleView: View {
    @Binding var isOn: Bool

    var body: some View {
        Toggle("Enabled", isOn: $isOn)
    }
}
```

Rule of thumb: the owning view uses `@State`; child views receive a projected value such as `$isOn` as `@Binding`. Use `@Binding` only when the child must be able to modify the parent’s state; use a plain value when it only needs read access.
