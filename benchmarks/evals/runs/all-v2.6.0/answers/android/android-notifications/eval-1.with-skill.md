On Android 8.0 (API 26) and later, every notification must be posted to an existing `NotificationChannel`. If the channel ID passed to `NotificationCompat.Builder` does not exist, the notification can be silently dropped.

Create the channel before posting notifications, typically from `Application.onCreate()` or before the first notification:

```kotlin
private const val NOTIFICATION_CHANNEL_ID = "default"

fun createNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
            NOTIFICATION_CHANNEL_ID,
            "Notifications",
            NotificationManager.IMPORTANCE_HIGH
        ).apply {
            description = "Application notifications"
        }

        context.getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }
}
```

Use that exact ID when building the notification and provide a valid small icon:

```kotlin
createNotificationChannel(this)

val notification = NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
    .setSmallIcon(R.drawable.ic_notification)
    .setContentTitle(title)
    .setContentText(body)
    .setAutoCancel(true)
    .build()

NotificationManagerCompat.from(this).notify(notificationId, notification)
```

Also check these common causes:

- The channel may have been disabled or its importance reduced in system settings. `NotificationManagerCompat.from(context).areNotificationsEnabled()` can detect app-level blocking, but channel-level settings must also be checked by the user.
- On Android 13 (API 33) and later, the app also needs `POST_NOTIFICATIONS` runtime permission. Declare it in the manifest and request it only after explaining the benefit to the user; a service cannot show the permission prompt itself.
- If the notification comes from FCM, ensure the `FirebaseMessagingService` is declared with the `com.google.firebase.MESSAGING_EVENT` intent action. For notification taps, use a `PendingIntent` and process its extras in both `MainActivity.onCreate()` and `onNewIntent()`.

The channel must be created once with a stable ID. Changing its importance in code later will not override a user's existing channel setting, so test with a fresh install or reset the channel when validating importance changes.

