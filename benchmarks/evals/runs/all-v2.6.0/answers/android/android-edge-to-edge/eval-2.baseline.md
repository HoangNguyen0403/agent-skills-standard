`WindowInsets.safeDrawing` includes the IME inset. `imePadding()` then accounts for the keyboard again, so the content receives the keyboard bottom inset twice (depending on where inset consumption occurs).

Choose one owner for the IME inset. For example, let the content handle the keyboard and exclude it from the `Scaffold` insets:

```kotlin
Scaffold(
    contentWindowInsets = WindowInsets.safeDrawing.exclude(WindowInsets.ime)
) { innerPadding ->
    Column(
        modifier = Modifier
            .padding(innerPadding)
            .imePadding()
    ) {
        // content
    }
}
```

Alternatively, remove `imePadding()` and let the `Scaffold`-provided insets handle it. Also avoid applying both `innerPadding` and an equivalent `safeDrawingPadding()` to the same container.

