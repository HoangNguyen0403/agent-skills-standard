# Passing a ViewModel to a child composable

Usually, no. Keep the `ViewModel` at the stateful screen boundary. Collect its state there, send only the data needed for rendering to the child, and pass events down as lambdas.

```kotlin
@Composable
fun ProfileScreen(viewModel: ProfileViewModel) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()

    ProfileContent(
        state = state,
        onSave = viewModel::save,
        onRetry = viewModel::retry,
    )
}

@Composable
fun ProfileContent(
    state: ProfileUiState,
    onSave: () -> Unit,
    onRetry: () -> Unit,
) {
    // Render state and invoke callbacks; do not know about the ViewModel.
}
```

This keeps the content composable stateless, reusable, and easy to preview/test. It also limits recomposition inputs and prevents the child from becoming coupled to the ViewModel’s API or lifecycle. A deeper composable should receive stable/immutable UI data and event callbacks, not a `ViewModel` or other state owner.

