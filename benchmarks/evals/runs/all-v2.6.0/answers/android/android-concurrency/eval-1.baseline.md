Avoid `GlobalScope` for work owned by a `ViewModel`. It creates an unstructured coroutine that is not cancelled when the `ViewModel` is cleared, can outlive the screen, makes failures harder to manage, and is difficult to test.

Use the lifecycle-aware `viewModelScope` instead:

```kotlin
class UserViewModel(
    private val repository: UserRepository,
) : ViewModel() {
    fun loadUser() {
        viewModelScope.launch {
            val user = withContext(Dispatchers.IO) {
                repository.loadUser()
            }
            // Update UI state on the main dispatcher.
        }
    }
}
```

`viewModelScope` is cancelled automatically when the `ViewModel` is cleared. If the work intentionally must survive the `ViewModel`—for example, durable background work—move it to an appropriately owned application scope, repository scope, or `WorkManager` job and inject that scope. Do not use `GlobalScope` as a shortcut for choosing that ownership.

