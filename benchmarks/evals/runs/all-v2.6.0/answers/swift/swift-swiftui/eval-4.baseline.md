Use `LazyVStack` inside a vertically scrolling `ScrollView` so rows are created as they approach the viewport instead of all at once:

```swift
struct ContentView: View {
    let items: [Item]

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 12) {
                ForEach(items) { item in
                    RowView(item: item)
                }
            }
            .padding()
        }
    }
}
```

For good performance:

- Give each item a stable, unique `id`; avoid `ForEach(items.indices)`.
- Keep row views lightweight and move expensive work out of `body`.
- Load images asynchronously and cache them.
- Avoid repeatedly sorting, filtering, or computing data inside `body`.
- Use pagination for very large datasets instead of rendering everything.
- Prefer value-based updates and narrow state dependencies so unchanged rows do not refresh unnecessarily.
- Use `LazyVGrid` instead when displaying a grid.

`LazyVStack` improves initial loading and memory usage, but it does not automatically make expensive row rendering or data processing fast.
