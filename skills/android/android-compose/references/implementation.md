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

## RIGHT / WRONG Patterns

### State hoisting

```kotlin
// RIGHT — Screen owns ViewModel, Content is stateless
@Composable
fun OrderScreen(viewModel: OrderViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    OrderContent(state = state, onAction = viewModel::onAction)
}

@Composable
fun OrderContent(state: OrderUiState, onAction: (OrderAction) -> Unit) {
    // Pure UI — no ViewModel, no side effects
}
```

```kotlin
// WRONG — ViewModel passed to child Composable
@Composable
fun OrderContent(viewModel: OrderViewModel) {  // <-- Don't do this
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    // Couples UI to ViewModel, prevents Preview, breaks testability
}
```

### Side effects

```kotlin
// RIGHT — LaunchedEffect for one-shot work
@Composable
fun DetailScreen(id: String, viewModel: DetailViewModel = hiltViewModel()) {
    LaunchedEffect(id) {
        viewModel.loadDetail(id)
    }
}
```

```kotlin
// WRONG — side effect in composition body
@Composable
fun DetailScreen(id: String, viewModel: DetailViewModel = hiltViewModel()) {
    viewModel.loadDetail(id)  // <-- Runs on every recomposition!
}
```

### LazyColumn keys

```kotlin
// RIGHT — stable key enables efficient diffing
LazyColumn {
    items(orders, key = { it.id }) { order ->
        OrderItem(order)
    }
}
```

```kotlin
// WRONG — no key causes full recomposition on list changes
LazyColumn {
    items(orders) { order ->  // <-- Missing key
        OrderItem(order)
    }
}
```

### Modifier reuse

```kotlin
// RIGHT — static Modifier declared outside Composable
private val CardModifier = Modifier
    .fillMaxWidth()
    .padding(16.dp)

@Composable
fun OrderCard(order: Order) {
    Card(modifier = CardModifier) { /* content */ }
}
```

```kotlin
// WRONG — Modifier created on every recomposition
@Composable
fun OrderCard(order: Order) {
    Card(modifier = Modifier.fillMaxWidth().padding(16.dp)) {
        // New Modifier allocation every recomposition
    }
}
```
