# Android 13 notification permission timing

Do not request `POST_NOTIFICATIONS` immediately on every app launch by default. The permission is runtime-controlled on Android 13 (API 33)+, and an unexplained prompt during startup often leads users to deny it. Ask when the user reaches a feature that clearly benefits from notifications, such as enabling chat alerts, tracking an order, or completing notification preferences. If notifications are essential to the app’s primary function, explain that value first and request it as part of that setup flow.

Declare the permission in the manifest:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Then request it only on API 33 or newer, after showing a short rationale or contextual explanation:

```kotlin
private val requestNotifications =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            // Notifications can now be posted, subject to channel settings.
        } else {
            // Keep the feature usable where possible and explain how to
            // enable notifications later in system settings.
        }
    }

fun askForNotificationsIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.POST_NOTIFICATIONS
        ) != PackageManager.PERMISSION_GRANTED
    ) {
        requestNotifications.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
}
```

Before asking, create the channels the app will use. Channels are mandatory on Android 8.0+, and channel settings are separate from the app-level runtime permission. A granted permission does not override a channel that the user has disabled or set to low importance.

The behavior also depends on the app’s target SDK:

- Apps targeting Android 13 or newer control when to call the permission request API.
- Apps targeting Android 12L/API 32 or lower have system-controlled prompt timing. Android may show the prompt automatically the first time the app starts an activity after it creates a notification channel. This is one reason to update the target SDK rather than relying on legacy timing.
- On Android versions below 13, `POST_NOTIFICATIONS` is not a runtime permission. The app can still post notifications if its channels and other requirements are correct.

Handle denial without repeatedly prompting. Store that the user has seen the explanation or completed the choice, ask again only when there is a meaningful new context, and provide a settings link if notification settings are needed:

```kotlin
startActivity(
    Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).apply {
        putExtra(Settings.EXTRA_APP_PACKAGE, packageName)
    }
)
```

Also account for the user disabling a particular channel, notification interruption policies, OEM battery restrictions, and the distinction between “permission granted” and “notifications actually visible.” The best timing is therefore feature-driven: explain the benefit, request once at that point, and allow the user to continue when notifications are optional.

