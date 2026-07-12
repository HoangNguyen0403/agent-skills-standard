Use `LazyVStack` inside a `ScrollView` for a vertically scrolling collection where creating every row up front would be expensive:

```swift
ScrollView {
    LazyVStack(alignment: .leading) {
        ForEach(items) { item in
            Row(item: item)
        }
    }
}
```

Lazy stacks create and lay out children as they become needed, reducing initial work and memory for long lists. Give rows stable, unique IDs, keep row bodies lightweight, and avoid doing expensive work during every body evaluation. Use `List` when its built-in behavior is appropriate; `LazyVStack` is not a guarantee that all scrolling or rendering work is free.

