Usually, no. The screen-level composable should obtain the `ViewModel`, collect its state, and pass a child only the state and callbacks it needs:

```kotlin
@Composable
fun DetailRoute(vm: DetailViewModel = viewModel()) {
    val state by vm.uiState.collectAsStateWithLifecycle()
    DetailScreen(
        state = state,
        onRefresh = vm::refresh,
        onSave = vm::save,
    )
}
```

This keeps `DetailScreen` stateless, reusable, and easy to preview and unit test. It also prevents a child from becoming coupled to a particular ViewModel or reaching into unrelated business logic. Passing a ViewModel can be reasonable for a tightly scoped, non-reusable screen or navigation destination, but it should be an intentional boundary; do not create or obtain a ViewModel inside a reusable child. Pass a smaller interface or state/events when only part of the ViewModel is needed.

