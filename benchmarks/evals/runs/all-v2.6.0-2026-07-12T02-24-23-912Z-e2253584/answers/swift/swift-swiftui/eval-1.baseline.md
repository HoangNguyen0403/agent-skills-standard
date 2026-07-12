`@State` is the source of truth for local value-type state owned by a view. SwiftUI preserves that storage across view redraws.

`@Binding` is a read/write reference to state owned elsewhere. Pass the projected value with `$` when a child view needs to edit the parent's state:

```swift
struct Parent: View {
    @State private var isOn = false
    var body: some View { ToggleView(isOn: $isOn) }
}

struct ToggleView: View {
    @Binding var isOn: Bool
    var body: some View { Toggle("Enabled", isOn: $isOn) }
}
```

Use `@State` for ownership and `@Binding` for borrowed access; do not create a second `@State` copy when the child should edit the same value.

