# Testing a `ViewModel` that uses `viewModelScope` and `StateFlow`

Use `kotlinx-coroutines-test` and replace `Dispatchers.Main` with a test dispatcher. `viewModelScope` runs on `Dispatchers.Main`, so without this replacement the test either needs an Android main looper or fails with a missing-main-dispatcher error. Inject other asynchronous dependencies, such as repositories, so the test does not depend on the network or a real database.

```kotlin
class MainDispatcherRule(
    val dispatcher: TestDispatcher = StandardTestDispatcher()
) : TestWatcher() {
    override fun starting(description: Description) {
        Dispatchers.setMain(dispatcher)
    }

    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
```

Example production code:

```kotlin
class UserViewModel(private val repository: UserRepository) : ViewModel() {
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()

    fun loadUser() {
        viewModelScope.launch {
            _uiState.value = try {
                UiState.Success(repository.loadUser())
            } catch (error: Throwable) {
                UiState.Error(error)
            }
        }
    }
}
```

The test can assert the initial value, trigger the public action, advance the virtual scheduler, and assert the resulting state:

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class UserViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    @Test
    fun `loadUser publishes success`() = runTest(mainDispatcherRule.dispatcher.scheduler) {
        val expected = User(id = "42", name = "Ada")
        val repository = FakeUserRepository(result = expected)
        val viewModel = UserViewModel(repository)

        assertEquals(UiState.Loading, viewModel.uiState.value)

        viewModel.loadUser()
        advanceUntilIdle()

        assertEquals(UiState.Success(expected), viewModel.uiState.value)
    }
}
```

`advanceUntilIdle()` runs queued coroutine work without sleeping. If the exact sequence matters, collect the `StateFlow` with a library such as Turbine and assert each item:

```kotlin
viewModel.uiState.test {
    assertEquals(UiState.Loading, awaitItem())
    viewModel.loadUser()
    assertEquals(UiState.Success(expected), awaitItem())
    cancelAndIgnoreRemainingEvents()
}
```

Because `StateFlow` always has a current value, a value assertion is often sufficient when only the final state matters. Use `runCurrent()` for work that should execute at the current virtual time, and `advanceTimeBy(...)` when testing delays or timeouts. Always close or cancel any collectors, and add separate tests for repository failure, repeated calls, cancellation, and loading-state behavior.


