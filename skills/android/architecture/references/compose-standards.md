# Jetpack Compose Best Practices

## State Management

- **State Hoisting**: Pass state as parameters and hoist events (lambdas) up to the caller to make composables stateless and testable.
- **collectAsStateWithLifecycle**: Always use `collectAsStateWithLifecycle()` from `androidx.lifecycle:lifecycle-runtime-compose` to observe Flow in UI to avoid resource leaks in background.
- **Immutable Models**: Use `@Immutable` or `@Stable` on UI models to help Compose compiler optimize recompositions.

## Performance & Stability

- **derivedStateOf**: Use `derivedStateOf` when a state is calculated from other state items to minimize unnecessary recompositions (e.g., scroll calculations).
- **remember**: Use `remember { ... }` for heavy object creations in Composables. Use `rememberSaveable` for state that must survive config changes.
- **Lazy List Keys**: Always provide a unique `key` in `LazyColumn` or `LazyRow` items to maintain scroll position and optimize list changes.

## UI Structure

- **Modifiers**: Pass a `modifier: Modifier = Modifier` as the first optional parameter to every reusable Composable. Chain modifiers in a predictable order (Size -> Padding -> Background).
- **Slot API**: Use "Slot" patterns (`content: @Composable () -> Unit`) to make layout components flexible and reusable.
- **Theme Coupling**: Access local colors/typography via `MaterialTheme.colorScheme` rather than hardcoding.

## Anti-Patterns

- **No ViewModel in Sub-composables**: Pass only required data/lambdas. ViewModels should only be accessed at the "Screen" (Level 0) composable.
- **No Side Effects in Composition**: Use `LaunchedEffect`, `SideEffect`, or `DisposableEffect` instead of running logic directly in the body of a Composable.
- **No Heavy Logic**: Keep Composable bodies focused on UI declaration; move business logic to ViewModels.
