# Testing Implementation

## Unit Tests (Coroutines)

```kotlin
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

class MyViewModelTest {
    @get:Rule val mainDispatcher = MainDispatcherRule()

    @Test
    fun `load data updates state`() = runTest {
        // Test setup
    }
}
```

## Compose UI Tests

```kotlin
@HiltAndroidTest
class FeedScreenTest {
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeRule = createAndroidComposeRule<MainActivity>()

    @Test
    fun showLoading_whenStateIsLoading() {
        // Setup state
        composeRule.onNodeWithTag("loading_spinner").assertIsDisplayed()
    }
}
```
