Use `StateFlow` for new code. It gives the ViewModel a coroutine-native, lifecycle-independent state holder with a current value, works naturally with other Flow operators, and can be collected using structured lifecycle-aware coroutines.

Expose an immutable `StateFlow` from the ViewModel:

```kotlin
private val _uiState = MutableStateFlow(UiState())
val uiState: StateFlow<UiState> = _uiState.asStateFlow()
```

Collect it in the Fragment using the **view lifecycle** and `repeatOnLifecycle`:

```kotlin
override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    super.onViewCreated(view, savedInstanceState)

    viewLifecycleOwner.lifecycleScope.launch {
        viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
            viewModel.uiState.collect { state ->
                binding.progressBar.isVisible = state.isLoading
                binding.errorMessage.text = state.error.orEmpty()
            }
        }
    }
}
```

LiveData is still reasonable legacy code, but observe it with `viewLifecycleOwner`, not `this`. If an immediate migration is not possible, a ViewModel can expose a legacy LiveData source as a Flow with `asFlow()`, then the Fragment can use the same `repeatOnLifecycle` pattern.

