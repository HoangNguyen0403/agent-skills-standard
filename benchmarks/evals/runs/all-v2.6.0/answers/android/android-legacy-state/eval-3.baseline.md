For new Kotlin code, prefer `StateFlow` for UI state in the ViewModel and collect it from the Fragment with `repeatOnLifecycle`. It integrates with coroutines, has an explicit current value and initial state, supports immutable state models, and composes naturally with operators such as `combine` and `stateIn`.

```kotlin
viewLifecycleOwner.lifecycleScope.launch {
    viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { state ->
            render(state)
        }
    }
}
```

`LiveData` is still a valid choice for existing code, Java-facing APIs, XML data binding, or libraries that already expose it. There is no requirement to rewrite a stable LiveData-based app solely for this reason. The choice is independent of using Fragments; the important part is observing or collecting with the view lifecycle so UI callbacks do not outlive the Fragment's view.

