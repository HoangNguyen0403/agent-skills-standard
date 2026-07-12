# Unit-testing a `viewModelScope` `StateFlow`

Use `kotlinx-coroutines-test` to replace `Dispatchers.Main`, because `viewModelScope` launches on the main dispatcher. Inject the repository or use case and mock it with MockK; the test must not make a real network call or depend on a real database.

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class MainDispatcherRule(
    val testDispatcher: TestDispatcher = UnconfinedTestDispatcher()
) : TestWatcher() {
    override fun starting(description: Description) {
        Dispatchers.setMain(testDispatcher)
    }

    override fun finished(description: Description) {
        Dispatchers.resetMain()
    }
}
```

Example production code:

```kotlin
class UserViewModel(
    private val repository: UserRepository,
) : ViewModel() {
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

Test the public action and the observable state rather than reaching into the ViewModel’s private job:

```kotlin
@OptIn(ExperimentalCoroutinesApi::class)
class UserViewModelTest {
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()

    private val repository = mockk<UserRepository>()

    @Test
    fun `loadUser emits success`() = runTest {
        val expected = User(id = "42", name = "Ada")
        coEvery { repository.loadUser() } returns expected
        val viewModel = UserViewModel(repository)

        assertEquals(UiState.Loading, viewModel.uiState.value)

        viewModel.loadUser()
        advanceUntilIdle()

        assertEquals(UiState.Success(expected), viewModel.uiState.value)
        coVerify(exactly = 1) { repository.loadUser() }
    }
}
```

`runTest` provides virtual coroutine execution; `advanceUntilIdle()` drains queued work without a wall-clock sleep. Use `runCurrent()` for work due at the current virtual time and `advanceTimeBy(...)` for deliberate delays or timeouts. Add separate tests for loading, repository failure, repeated calls, and cancellation. If every intermediate emission matters, collect the `StateFlow` with a coroutine-test collector such as Turbine and assert each state in order.


