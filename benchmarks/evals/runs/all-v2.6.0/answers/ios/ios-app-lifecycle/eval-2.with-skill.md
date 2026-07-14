Common anti-patterns to avoid in the iOS app lifecycle:

- Putting too much logic in `AppDelegate`. Keep it slim and move setup and orchestration into a `Bootstrapper` or `AppCoordinator`.
- Managing `UIWindow` manually in `AppDelegate` on iOS 13+. Use `SceneDelegate` for window and scene-specific lifecycle handling.
- Doing synchronous network or heavy work during app launch. Launch should stay fast; move blocking work off the main thread.
- Handling deep links in an ad hoc way. Prefer Universal Links over custom URL schemes, and route them centrally through scene lifecycle methods and a coordinator.
- Scheduling background work without expiration handling. If you use `BGTaskScheduler`, always provide an `expirationHandler` so the app can clean up before the system terminates the task.

