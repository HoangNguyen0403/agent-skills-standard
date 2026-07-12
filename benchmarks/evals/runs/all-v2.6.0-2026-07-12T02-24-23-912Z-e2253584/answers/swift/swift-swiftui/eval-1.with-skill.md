Use `@State` for mutable value data owned by the current view, and `@Binding` when a child receives a two-way reference to state owned by a parent:

```swift
struct Parent: View {
    @State private var isOn = false
    var body: some View { ToggleRow(isOn: $isOn) }
}

struct ToggleRow: View {
    @Binding var isOn: Bool
    var body: some View { Toggle("Enabled", isOn: $isOn) }
}
```

Keep `@State` private and pass `$value` to create a binding. Do not use `@Binding` to establish ownership.


