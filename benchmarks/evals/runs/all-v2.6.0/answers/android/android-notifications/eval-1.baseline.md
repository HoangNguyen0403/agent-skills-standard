# Why notifications disappear on Android 8+

Android 8.0 (API 26) introduced notification channels. Every notification posted on Android 8+ must use a channel, and the channel must already exist. If the channel is missing, the notification is discarded or routed through an unintended fallback, depending on how it was created.

Create the channel once at application startup, before FCM or other code can post a notification:

```kotlin
class App : Application() {
    override fun onCreate() {
        super.onCreate()

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "general",
                "General notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "General app updates"
            }

            getSystemService(NotificationManager::class.java)
                .createNotificationChannel(channel)
        }
    }
}
```

Register that class in the manifest with `android:name=".App"`. When building a notification, pass the same channel ID:

```kotlin
NotificationCompat.Builder(context, "general")
    .setSmallIcon(R.drawable.ic_notification)
    .setContentTitle("Update")
    .setContentText("Your update is ready")
    .setPriority(NotificationCompat.PRIORITY_DEFAULT)
    .setAutoCancel(true)
    .build()
```

If the notification is sent by Firebase Cloud Messaging, the server payload’s `android.notification.channel_id` (or the legacy `android_channel_id`) must match an existing channel. You can also configure a default FCM channel in the manifest using `com.google.firebase.messaging.default_notification_channel_id`. The channel’s importance, sound, vibration, and visibility are controlled by the channel; after creation, users can change most of those settings, and changing them in code later generally has no effect. Use a new channel ID only when you intentionally need a different behavior.

Also check the following:

- Android 13 (API 33)+ additionally requires the runtime `POST_NOTIFICATIONS` permission. Android 8 itself does not.
- Declare `<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />` and request it at runtime on API 33+ before expecting user-visible notifications.
- The notification must have a valid small icon. A missing or invalid icon can cause posting to fail; use a white-on-transparent status-bar icon rather than a full-color launcher icon.
- Verify the app and the particular channel are enabled in system settings. A user can disable a channel or reduce its importance to low/minimized.
- Give each notification a stable, nonzero ID if you expect updates, and avoid accidentally cancelling it immediately.
- For FCM, confirm that the device has a current registration token and that the server response accepted the message. A notification payload is displayed by the system when the app is backgrounded, but data-only messages require your `FirebaseMessagingService` to create the notification itself.
- Test foreground and background separately: FCM notification messages are not delivered to `onMessageReceived()` in the usual background case; the system tray displays them instead.

The fastest diagnosis is to log the channel ID used by the builder or FCM payload, inspect that channel under Settings > Notifications for the app, and check Logcat for `NotificationManager`, FCM, and permission errors.

