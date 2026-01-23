# Legacy State Implementation

## Consuming Flows in Fragments

```kotlin
// In Fragment.onViewCreated
viewLifecycleOwner.lifecycleScope.launch {
    viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
        viewModel.uiState.collect { state ->
            // Use ViewBinding to update UI
            binding.progressBar.isVisible = state.isLoading
            binding.errorMsg.text = state.error
        }
    }
}
```

## Migration from LiveData

If you cannot remove LiveData immediately, expose it as Flow to the UI:

```kotlin
// ViewModel
private val _liveData = MutableLiveData<String>()
val flow: Flow<String> = _liveData.asFlow()
```
