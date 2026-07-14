No. Avoid `GlobalScope` in a `ViewModel`: it is not tied to the `ViewModel` lifecycle, so work can continue after the `ViewModel` is cleared and may leak or update stale state.

Use `viewModelScope`, which cancels its children when the `ViewModel` is cleared:

```kotlin
class ItemsViewModel(
    private val repository: ItemsRepository,
) : ViewModel() {
    fun loadItems() {
        viewModelScope.launch {
            repository.loadItems()
        }
    }
}
```

Keep dispatcher selection injectable in the repository or use case rather than hardcoding `Dispatchers.IO`:

```kotlin
suspend fun loadItems() = withContext(dispatchers.io) {
    api.fetchItems()
}
```

Use `lifecycleScope` for Activity/Fragment work. These lifecycle-bound scopes preserve structured concurrency and make cancellation predictable.

