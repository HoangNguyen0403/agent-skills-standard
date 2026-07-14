With edge-to-edge, the `LazyColumn` can start beneath the status bar unless the scrolling container accounts for the top inset. Give the list inset-aware `contentPadding`:

```kotlin
LazyColumn(
    modifier = Modifier.fillMaxSize(),
    contentPadding = WindowInsets.statusBars.asPaddingValues()
) {
    items(items) { item ->
        ItemRow(item)
    }
}
```

Use `WindowInsets.safeDrawing.asPaddingValues()` if the list also needs to avoid the navigation bar, cutout, or IME. If the list is inside a `Scaffold`, pass the `innerPadding` to `contentPadding` instead. Applying the inset as list content padding keeps the items scrollable while leaving the first item below the status bar; do not also apply the same inset with `statusBarsPadding()` or `safeDrawingPadding()`.

