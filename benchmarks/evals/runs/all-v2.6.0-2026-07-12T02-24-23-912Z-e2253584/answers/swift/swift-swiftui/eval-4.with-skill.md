Use `LazyVStack` inside a scrolling container when a large vertical collection should create child views lazily as they appear:

```swift
ScrollView {
    LazyVStack(alignment: .leading) {
        ForEach(items) { item in
            ItemRow(item: item)
        }
    }
}
```

Use `LazyHStack` for horizontal collections. Keep expensive work out of `body`; move it to methods/computed properties and perform asynchronous loading with `.task()`.


