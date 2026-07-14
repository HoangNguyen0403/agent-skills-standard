# Why `Thread.sleep(2000)` is bad in a UI test

`Thread.sleep` waits for an arbitrary amount of wall-clock time. It makes the suite slower, can still be too short on a busy emulator or CI worker, blocks the test thread, and does not prove that the repository, coroutine, worker, or UI has reached the state being asserted. That creates timing-dependent flaky tests and hides real synchronization problems.

Wait for an observable condition with a bounded timeout. For Compose:

```kotlin
composeRule.onNodeWithTag("load_button").performClick()

composeRule.waitUntil(timeoutMillis = 5_000) {
    composeRule.onAllNodesWithTag("result")
        .fetchSemanticsNodes()
        .isNotEmpty()
}

composeRule.onNodeWithTag("result").assertIsDisplayed()
```

Use a stable text, content description, or test tag representing the user-visible completion state. `awaitIdle()` or `waitForIdle()` is appropriate for Compose work already scheduled through Compose, but it is not a general wait for arbitrary network or background-thread work.

For Espresso, expose the asynchronous operation with an `IdlingResource`, commonly a `CountingIdlingResource`, and register/unregister it with `IdlingRegistry` in setup and teardown:

```kotlin
idlingResource.increment()
repository.loadAsync(
    onComplete = {
        try {
            // Update the UI.
        } finally {
            idlingResource.decrement()
        }
    },
)
```

For coroutine unit tests, use `runTest` with the skill’s `MainDispatcherRule`, then call `advanceUntilIdle()` (or `advanceTimeBy(...)` for a deliberate virtual delay). For WorkManager, use its test APIs and controlled executors. Do not replace synchronization with a longer sleep; make the async work observable and fail after a finite timeout with a useful diagnostic. Tests should assert loading, success, and error states rather than implementation timing.


