The double padding occurs because two inset owners are handling the same bottom space when the IME opens: `Scaffold` consumes `WindowInsets.safeDrawing`, and `imePadding()` adds keyboard insets to that same content. The overlapping bottom inset is therefore applied twice.

Choose one owner for the content. For example, keep Scaffold's inset handling and pass its `PaddingValues` through, without adding `imePadding()` to that same content:

```kotlin
Scaffold(
    contentWindowInsets = WindowInsets.safeDrawing,
) { innerPadding ->
    Column(Modifier.padding(innerPadding)) {
        // fields and content
    }
}
```

Alternatively, make Scaffold stop applying those insets and apply `imePadding()` yourself to the content container, along with any required safe-drawing inset exactly once. Keep `imePadding()` before `verticalScroll()`. Do not combine `contentWindowInsets = WindowInsets.safeDrawing` with `imePadding()` on the same content path.

