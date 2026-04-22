# Edge-to-Edge Inset Patterns

## Scaffold with IME

### RIGHT — contentWindowInsets includes IME

```kotlin
// RIGHT: IME insets flow through innerPadding via contentWindowInsets
Scaffold(contentWindowInsets = WindowInsets.safeDrawing) { innerPadding ->
    Column(
        modifier = Modifier
            .padding(innerPadding)
            .consumeWindowInsets(innerPadding)
            .verticalScroll(rememberScrollState())
    ) { /* Content */ }
}
```

### RIGHT — fitInside ignores contentWindowInsets

```kotlin
// RIGHT: fitInside handles IME regardless of contentWindowInsets
Scaffold { innerPadding ->
    Column(
        modifier = Modifier
            .padding(innerPadding)
            .consumeWindowInsets(innerPadding)
            .fitInside(WindowInsetsRulers.Ime.current)
            .verticalScroll(rememberScrollState())
    ) { /* Content */ }
}
```

### RIGHT — default contentWindowInsets + imePadding

```kotlin
// RIGHT: default contentWindowInsets excludes IME, so imePadding is safe
Scaffold { innerPadding ->
    Column(
        modifier = Modifier
            .padding(innerPadding)
            .consumeWindowInsets(innerPadding)
            .imePadding()
            .verticalScroll(rememberScrollState())
    ) { /* Content */ }
}
```

### WRONG — double IME padding

```kotlin
// WRONG: safeDrawing includes IME insets, and imePadding adds them again
Scaffold(contentWindowInsets = WindowInsets.safeDrawing) { innerPadding ->
    Column(
        modifier = Modifier
            .padding(innerPadding)
            .imePadding()  // <-- Double padding!
            .verticalScroll(rememberScrollState())
    ) { /* Content */ }
}
```

### WRONG — no IME handling at all

```kotlin
// WRONG: default contentWindowInsets excludes IME, and nothing else handles it
Scaffold { innerPadding ->
    Column(
        modifier = Modifier
            .padding(innerPadding)
            .verticalScroll(rememberScrollState())
    ) { /* Content — will be covered by keyboard */ }
}
```

## Without Scaffold

### RIGHT — consumed insets prevent double padding

```kotlin
// RIGHT: safeDrawingPadding consumes insets, so imePadding won't double-apply
Box(modifier = Modifier.safeDrawingPadding()) {
    Column(modifier = Modifier.imePadding()) { /* Content */ }
}
```

### WRONG — unconsumed insets cause double padding

```kotlin
// WRONG: asPaddingValues() does NOT consume insets — imePadding adds them again
Box(modifier = Modifier.padding(WindowInsets.safeDrawing.asPaddingValues())) {
    Column(modifier = Modifier.imePadding()) { /* Content — double padded */ }
}
```

## Lists

### RIGHT — contentPadding on LazyColumn

```kotlin
Scaffold { innerPadding ->
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .consumeWindowInsets(innerPadding),
        contentPadding = innerPadding  // Items scroll behind system bars
    ) { /* items */ }
}
```

### WRONG — parent padding clips scroll

```kotlin
Scaffold { innerPadding ->
    Box(modifier = Modifier.padding(innerPadding)) {  // <-- Clips scroll!
        LazyColumn { /* items cannot scroll behind system bars */ }
    }
}
```

## System bar legibility

For apps using `enableEdgeToEdge` from `WindowCompat` (not `ComponentActivity`):

```kotlin
@Composable
fun MyTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as? Activity)?.window ?: return@SideEffect
            val controller = WindowCompat.getInsetsController(window, view)
            controller.isAppearanceLightStatusBars = !darkTheme
            controller.isAppearanceLightNavigationBars = !darkTheme
        }
    }
    MaterialTheme(content = content)
}
```
