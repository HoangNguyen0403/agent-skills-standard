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

## State Hoisting Example

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel = hiltViewModel()) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    ProfileContent(
        user = uiState.user,
        onEditClick = viewModel::onEditClick  // lambda down
    )
}

@Composable
fun ProfileContent(user: User, onEditClick: () -> Unit) {
    Column { Text(user.name); Button(onClick = onEditClick) { Text("Edit") } }
}
```

## derivedStateOf Usage

```kotlin
val filteredItems by remember {
    derivedStateOf { items.filter { it.isActive } }
}
```
