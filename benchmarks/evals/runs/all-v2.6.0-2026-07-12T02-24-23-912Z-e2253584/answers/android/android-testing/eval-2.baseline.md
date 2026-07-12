# Testing a Composable screen with a Hilt-injected `ViewModel`

There are two useful test layers. Make the visual/content Composable accept state and callbacks as parameters, then test it quickly with a fake state. Separately, add an instrumentation integration test for the route that obtains the real `ViewModel` through Hilt. This keeps most UI tests deterministic while still verifying the Hilt wiring and real ViewModel behavior.

Structure the screen like this:

```kotlin
@Composable
fun UserRoute(
    viewModel: UserViewModel = hiltViewModel()
) {
    val state by viewModel.uiState.collectAsStateWithLifecycle()
    UserScreen(
        state = state,
        onRetry = viewModel::retry
    )
}

@Composable
fun UserScreen(state: UserUiState, onRetry: () -> Unit) {
    // Render only from state and invoke callbacks for user actions.
}
```

The pure UI test does not need Hilt:

```kotlin
@get:Rule
val composeRule = createComposeRule()

@Test
fun `error state shows retry action`() {
    composeRule.setContent {
        UserScreen(state = UserUiState.Error("Offline"), onRetry = {})
    }

    composeRule.onNodeWithText("Offline").assertIsDisplayed()
    composeRule.onNodeWithText("Retry").assertIsDisplayed()
}
```

For the real Hilt path, use an Android instrumentation test, a test Activity annotated with `@AndroidEntryPoint`, and the Hilt test rule. Register the test Activity in the `androidTest` manifest.

```kotlin
@AndroidEntryPoint
class HiltTestActivity : ComponentActivity()
```

```kotlin
@HiltAndroidTest
@RunWith(AndroidJUnit4::class)
class UserRouteTest {
    @get:Rule(order = 0)
    val hiltRule = HiltAndroidRule(this)

    @get:Rule(order = 1)
    val composeRule = createAndroidComposeRule<HiltTestActivity>()

    @Before
    fun setUp() {
        hiltRule.inject()
    }

    @Test
    fun `route renders data from the real view model`() {
        composeRule.setContent {
            AppTheme { UserRoute() }
        }

        composeRule.onNodeWithText("Ada").assertIsDisplayed()
    }
}
```

The Activity must be an actual Hilt entry point; a plain `ComponentActivity` cannot create a Hilt ViewModel factory. If the route is hosted by Navigation, set the content inside a `NavHost` and obtain the ViewModel from the appropriate navigation back-stack entry, since `hiltViewModel()` is scoped to the current owner.

Use `@TestInstallIn` to replace production repository or data-source bindings with a deterministic fake while retaining the real Hilt graph. For example, a test module can replace the production `UserRepository` binding with a fake that returns known data or exposes a controllable deferred result. Avoid a real network in this test. If the objective is only rendering, use the pure `UserScreen` test; if it is Hilt wiring, ViewModel creation, and state propagation, use the instrumentation test above.


