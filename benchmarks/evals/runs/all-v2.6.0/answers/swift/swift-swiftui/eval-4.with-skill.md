Use `LazyVStack` inside a `ScrollView` when displaying a large number of views. It creates rows lazily, loading them only as they appear:

```swift
struct ItemList: View {
    let items: [Item]

    var body: some View {
        ScrollView {
            LazyVStack(alignment: .leading, spacing: 12) {
                ForEach(items) { item in
                    ItemRow(item: item)
                }
            }
            .padding()
        }
    }
}
```

For best performance:

- Keep each row lightweight.
- Avoid heavy computation in `body`; perform async work with `@State` and `.task()`.
- Use stable `Identifiable` IDs in `ForEach`.
- Make views `Equatable` when appropriate to prevent unnecessary re-renders.
- Use `VStack` for small, non-scrolling collections; `LazyVStack` helps primarily with large scrolling lists.
