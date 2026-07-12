No. On Android 13 (API 33) and later, request `POST_NOTIFICATIONS` at a contextually useful point after explaining why notifications help. Do not show the system prompt unconditionally on the first app launch; a short priming dialog improves the user's understanding and avoids an unexpected permission request.

Declare the permission:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
```

Register a launcher in an activity and guard it by API level and current permission state:

```kotlin
private val notificationPermissionLauncher =
    registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) {
            // Notifications can now be posted.
        } else {
            // Respect the decision; offer notification settings later if useful.
        }
    }

private fun requestNotificationPermissionIfNeeded() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) !=
            PackageManager.PERMISSION_GRANTED
    ) {
        notificationPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
}
```

Call that function only after a priming explanation, for example when the user enables alerts or reaches a feature that depends on them:

```kotlin
AlertDialog.Builder(this)
    .setTitle("Enable notifications?")
    .setMessage("Get timely updates about your orders.")
    .setPositiveButton("Continue") { _, _ ->
        requestNotificationPermissionIfNeeded()
    }
    .setNegativeButton("Not now", null)
    .show()
```

Create the app's `NotificationChannel` separately on Android 8+ before posting notifications. The runtime permission and the channel are different gates: API 33+ requires both the permission and a valid channel, while older Android versions do not use `POST_NOTIFICATIONS`. If the user denies the request, do not repeatedly prompt; respect the choice and provide a settings route at an appropriate later point if the product needs one.

