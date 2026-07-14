Common iOS app lifecycle anti-patterns to avoid:

- Putting heavy work in `application(_:didFinishLaunchingWithOptions:)` or initial scene setup, which slows launch.
- Treating the app lifecycle as a single global flow and ignoring multi-scene behavior on iPadOS or newer iOS versions.
- Saving critical state only when the app terminates; apps are often suspended or killed without a clean termination callback.
- Starting or resuming sensitive work in the wrong state, such as using UI resources before the app is active.
- Failing to pause timers, rendering, location, camera, or network-intensive tasks when entering background.
- Depending on lifecycle callbacks being called in a strict or guaranteed order across all versions and system situations.
- Mixing unrelated responsibilities into lifecycle handlers instead of routing work to focused coordinators/services.
- Not making background transitions idempotent, which can cause duplicate refreshes, saves, or analytics events.
- Ignoring scene-based callbacks and continuing to rely only on older app delegate hooks.
- Forgetting to release observers, tasks, or subscriptions tied to lifecycle changes, which can cause leaks or duplicate handling.
- Triggering navigation or modal presentation directly from lifecycle callbacks before the UI hierarchy is ready.
- Not testing edge cases like interrupted launches, background relaunch, deep links, push notification opens, and low-memory recovery.

