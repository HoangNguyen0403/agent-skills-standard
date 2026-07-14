# Why `Thread.sleep(2000)` is a bad UI-test wait

`Thread.sleep` waits for an arbitrary wall-clock duration rather than for the operation the test cares about. It makes every test slower, can still be too short on a busy emulator or CI worker, and hides synchronization bugs. It also blocks the test thread and does not tell Espresso or Compose that an asynchronous repository, callback, coroutine, or worker has become idle. The result is a flaky test that may pass or fail depending on timing.

Wait for an observable condition or expose the asynchronous work to the test framework instead.

For a Compose test, wait for a semantic condition with a bounded timeout:

```kotlin
composeRule.onNodeWithTag("load").performClick()

composeRule.waitUntil(timeoutMillis = 5_000) {
    composeRule.onAllNodesWithTag("result")
        .fetchSemanticsNodes()
        .isNotEmpty()
}

composeRule.onNodeWithTag("result").assertIsDisplayed()
```

Use a stable text, content description, or test tag that represents the user-visible completion state. `awaitIdle()` or `waitForIdle()` is useful for Compose work already known to be scheduled through Compose, but it does not automatically wait for arbitrary network or background-thread work.

For Espresso, register an idling resource around the asynchronous operation, commonly a `CountingIdlingResource`:

```kotlin
idlingResource.increment()
repository.loadAsync(
    onComplete = {
        try {
            // Update the UI.
        } finally {
            idlingResource.decrement()
        }
    }
)
```

Register it with `IdlingRegistry` in setup and unregister it in teardown. Espresso then waits until the count reaches zero before performing assertions. For coroutines, a better unit-test boundary is `runTest` with a test dispatcher and `advanceUntilIdle()` (or `advanceTimeBy(...)` for a deliberate virtual delay), rather than sleeping in real time. For WorkManager, use its test APIs and controlled executors.

The production code should also expose a meaningful loading/success/error state so the test can assert behavior, not implementation timing. Keep a finite timeout so a genuine hang fails with a useful diagnostic instead of waiting forever.


