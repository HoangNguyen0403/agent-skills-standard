`launchWhenStarted` is deprecated for Flow collection. It suspends the collecting coroutine when the Fragment is stopped, but it does not provide the same structured start/stop behavior for the upstream Flow and can keep resources or producers active unnecessarily. In a Fragment, collect against the **view lifecycle** with `repeatOnLifecycle`:

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

`repeatOnLifecycle` cancels the collection when the view leaves `STARTED` and starts it again when the view returns. Using `viewLifecycleOwner` also prevents a collector from trying to update a destroyed Fragment view after navigation.

