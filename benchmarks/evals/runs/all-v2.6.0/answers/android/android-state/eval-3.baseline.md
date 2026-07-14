In a Jetpack Compose screen, collect the `ViewModel`'s `StateFlow` with `collectAsStateWithLifecycle()`. It observes the flow only while the screen's lifecycle is at least started, which avoids keeping UI collection active while the screen is stopped.

```kotlin
@Composable
fun UserRoute(
    viewModel: UserViewModel = viewModel()
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    UserContent(
        state = uiState,
        onRetry = viewModel::loadUsers
    )
}

@Composable
private fun UserContent(
    state: UserUiState,
    onRetry: () -> Unit
) {
    when (state) {
        UserUiState.Loading -> CircularProgressIndicator()
        is UserUiState.Success -> UserList(state.users)
        is UserUiState.Error -> ErrorMessage(
            text = state.message,
            onRetry = onRetry
        )
    }
}
```

`collectAsStateWithLifecycle` is provided by the `androidx.lifecycle:lifecycle-runtime-compose` dependency. It converts the latest flow value into Compose `State`, so recomposition occurs when the `StateFlow` emits. Keep the `ViewModel` scoped to the appropriate navigation destination or activity, and pass state plus callbacks to stateless content where practical; do not construct a new `ViewModel` during recomposition.

`collectAsState()` is a reasonable alternative in contexts without an Android lifecycle, but for an Android screen the lifecycle-aware API is generally the safer default. Use `LaunchedEffect` for separate one-shot effects, not as a replacement for rendering state from the flow. UI actions such as retry or submit should call `ViewModel` methods rather than mutate the flow from the composable.

