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

## Configuration Change — Retained ViewModel (Same Process)

```kotlin
// scenario.recreate() destroys and re-creates the Activity in the SAME process.
// An Activity-scoped ViewModel survives it, so this asserts RETENTION only:
// it still passes if every SavedStateHandle write and restore is deleted.
// Saved-state serialization needs the reconstructed-owner test below;
// process replacement needs external device control
// (adb shell am kill/force-stop + cold launch), otherwise BLOCKED.
@Test
fun checkoutFlow_configurationChange_retainsViewModelState() {
    ActivityScenario.launch(CheckoutActivity::class.java).use { scenario ->
        scenario.onActivity { activity ->
            activity.viewModel.updateDeliveryNotes("Leave at front porch")
        }

        scenario.recreate() // same-process config change

        scenario.onActivity { activity ->
            assertEquals("Leave at front porch", activity.viewModel.uiState.value.deliveryNotes)
        }
    } // .use closes the scenario even when an assertion fails
}
```

## Saved-State Serialization — Reconstructed Owner

```kotlin
// Proves the write path stores the draft and the read path restores it.
// The second owner is FRESH: reusing the first ViewModel instance would prove nothing.
@Test
fun checkoutViewModel_savedState_restoresDraftAfterReconstruction() {
    val handle = SavedStateHandle()
    val original = CheckoutViewModel(handle, FakeCheckoutRepository())

    original.updateDeliveryNotes("Leave at front porch")
    val persisted = handle.get<String>("deliveryNotes") // what the ViewModel actually wrote

    val restored = CheckoutViewModel(SavedStateHandle(mapOf("deliveryNotes" to persisted)), FakeCheckoutRepository())

    assertEquals("Leave at front porch", restored.uiState.value.deliveryNotes)
}
```

## TalkBack Semantics Node Test (In-Memory Tree Only)

```kotlin
// Note: onNodeWithContentDescription verifies accessibility node tree attributes in Compose.
// It does NOT prove actual TalkBack audio announcement, focus traversal order, or gesture navigation on a device.
@Test
fun orderSubmitButton_hasAccessibleTalkBackSemantics() {
    composeRule.setContent {
        SubmitOrderButton(itemCount = 3, onClick = {})
    }

    // Verify accessibility content description exists and is descriptive
    composeRule.onNodeWithContentDescription("Submit order for 3 items")
        .assertIsDisplayed()
        .assertHasClickAction()
}
```

## Logout — Local Purge & Session Invalidation

```kotlin
// Drives the real logout entry point, not tokenStorage.clear() directly.
// The identity double VALIDATES tokens, so "revoked" means the old credential is
// rejected — a recorded revoke request alone proves nothing.
// Adapter-level only: it never proves Keystore enforcement.
@Test
fun logout_purgesLocalToken_andRejectsOldSessionToken() = runTest {
    val secureStore = FakeSecureStore()                 // test-owned, synthetic identity only
    val identity = StatefulIdentityBoundary()           // sign-in issues, validate() checks, logout revokes
    val auth = AuthSessionManager(secureStore, identity)
    auth.signIn(SyntheticIdentity(retailUserId = "qa-user-1"))

    val oldToken = requireNotNull(secureStore.read("refresh_token"))
    identity.validate(oldToken)                         // precondition: token is live

    auth.logout()

    assertNull(secureStore.read("refresh_token"))
    assertFailsWith<SessionRevokedException> { identity.validate(oldToken) }
}
```

```kotlin
// Teardown contract: purge only the synthetic test-owned file, even on failure.
@After
fun tearDown() {
    context.deleteSharedPreferences("test_secure_prefs")
}
```

```kotlin
@Test
fun authSession_encryptedPreferences_roundTripsSyntheticToken() {
    val context = ApplicationProvider.getApplicationContext<Context>()
    val masterKey = MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build()
    val securePrefs = EncryptedSharedPreferences.create(
        context, "test_secure_prefs", masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
    )

    val tokenStorage = EncryptedTokenStorage(securePrefs)
    tokenStorage.saveToken("synthetic_bearer_token")
    assertEquals("synthetic_bearer_token", tokenStorage.getToken())
}
```
