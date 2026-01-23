# Jetpack Compose Implementation

## Theme Setup (Material 3)

```kotlin
@Composable
fun AppTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    MaterialTheme(
        colorScheme = colorScheme,
        typography = Typography,
        content = content
    )
}
```

## State Hoisting & UDF

```kotlin
@Composable
fun FeedScreen(
    viewModel: FeedViewModel = hiltViewModel(),
    onPostClick: (Long) -> Unit
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    FeedContent(state = state, onPostClick = onPostClick)
}

@Composable
fun FeedContent(
    state: FeedUiState,
    onPostClick: (Long) -> Unit
) {
    // Pure UI - No ViewModel references here
    LazyColumn { /* ... */ }
}
```

## Stability & Performance

- Use `@Immutable` or `@Stable` on UI State classes to enable skipping.
- Avoid passing Lists; use `ImmutableList` (Kotlinx Collections Immutable).
