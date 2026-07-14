Common iOS notification anti-patterns to avoid:

- Requesting notification permission unconditionally on first launch, before explaining the value to the user.
- Failing to implement `UNUserNotificationCenterDelegate`, which breaks proper foreground presentation and tap handling.
- Not using the `UserNotifications` framework consistently for notification handling.
- Forgetting to register for remote notifications in `AppDelegate` when using APNs.
- Neglecting badge management, especially leaving stale app icon badges instead of clearing or updating them intentionally.
- Treating notification permissions as a one-time technical step instead of a user experience flow with context and timing.

