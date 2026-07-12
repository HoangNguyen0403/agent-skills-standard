Apply the system-bar insets as the `LazyColumn`'s `contentPadding`, not as padding on its parent. This lets the first and last items scroll into the inset area without being clipped.

Inside a `Scaffold`, pass through the Scaffold padding:

```kotlin
Scaffold { innerPadding ->
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = innerPadding,
    ) {
        items(items) { item ->
            ItemRow(item)
        }
    }
}
```

If the list is outside a Scaffold, use the safe-drawing insets as its `contentPadding` (or apply `safeDrawingPadding()` to the appropriate non-list container). Avoid `Modifier.padding(...)` on the list's parent, which clips the scrollable content against the status bar.

