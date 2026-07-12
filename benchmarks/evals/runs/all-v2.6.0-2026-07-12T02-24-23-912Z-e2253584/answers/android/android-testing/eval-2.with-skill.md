# Testing a Hilt-injected ViewModel used by a Composable

Use an Android instrumentation test with both `HiltAndroidRule` and `createAndroidComposeRule`. The Hilt rule must run first, and `hiltRule.inject()` must be called before the Activity or composable resolves the injected ViewModel. Use a test Activity annotated with `@AndroidEntryPoint` when the production Activity is not suitable.

```kotlin
@AndroidEntryPoint
class HiltTestActivity : ComponentActivity()
```

```kotlin
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class FeedScreenTest {
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeRule = createAndroidComposeRule<HiltTestActivity>()

    @Before
    fun setUp() {
        hiltRule.inject()
    }

    @Test
    fun `screen renders the ViewModel state`() {
        composeRule.setContent {
            AppTheme {
                FeedRoute() // FeedRoute obtains its ViewModel with hiltViewModel()
            }
        }

        composeRule.onNodeWithTag("feed_content").assertIsDisplayed()
    }
}
```

Replace the production repository or data-source binding with a deterministic fake in the `androidTest` source set. `@TestInstallIn` preserves the real Hilt graph while preventing network access:

```kotlin
@Module
@TestInstallIn(
    components = [SingletonComponent::class],
    replaces = [ProductionRepositoryModule::class],
)
object TestRepositoryModule {
    @Provides
    @Singleton
    fun provideRepository(): FeedRepository = FakeFeedRepository(
        result = listOf(FeedItem("known-item")),
    )
}
```

The fake should expose predictable success, loading, and failure states so the test can assert user-visible behavior. Do not use a real network or production backend in the test.

For maintainability, split the route from the stateless UI:

```kotlin
@Composable
fun FeedRoute(viewModel: FeedViewModel = hiltViewModel()) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    FeedScreen(state = state, onRetry = viewModel::retry)
}

@Composable
fun FeedScreen(state: FeedUiState, onRetry: () -> Unit) {
    // Render only from state and invoke callbacks for user actions.
}
```

Test `FeedScreen` separately with `createComposeRule()` and supplied fake state for fast rendering coverage; keep the Hilt instrumentation test for ViewModel creation, dependency wiring, and state propagation. If the route is inside Navigation, provide the appropriate NavHost/back-stack owner because `hiltViewModel()` is scoped to that owner.


