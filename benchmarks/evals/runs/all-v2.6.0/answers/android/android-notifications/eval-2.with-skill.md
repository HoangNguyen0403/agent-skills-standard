Use Firebase Cloud Messaging (FCM) with a `FirebaseMessagingService`, a notification channel, and a `PendingIntent` for taps.

First add Firebase Messaging using the Firebase BoM:

```groovy
dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging-ktx'
}
```

Declare the service in `AndroidManifest.xml`:

```xml
<service
    android:name=".MyFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

Implement token registration and message handling. The channel must exist before `NotificationCompat.Builder` is used:

```kotlin
private const val CHANNEL_ID = "default"

class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // Persist or send the token to the backend for this signed-in user.
        sendTokenToBackend(token)
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val notification = message.notification

        // Keep the payload small; use the IDs to fetch full content in the app.
        showNotification(
            title = notification?.title ?: "New update",
            body = notification?.body ?: "Open the app to view it",
            type = data["type"],
            id = data["id"]
        )
    }

    private fun showNotification(title: String, body: String, type: String?, id: String?) {
        createNotificationChannel(this)

        // POST_NOTIFICATIONS must have been granted by the app UI on API 33+.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS
            ) != PackageManager.PERMISSION_GRANTED
        ) return

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("type", type)
            putExtra("id", id)
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(this)
            .notify(id?.hashCode() ?: System.currentTimeMillis().toInt(), notification)
    }
}

private fun createNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel(
            CHANNEL_ID,
            "Notifications",
            NotificationManager.IMPORTANCE_HIGH
        )
        context.getSystemService(NotificationManager::class.java)
            .createNotificationChannel(channel)
    }
}
```

In `MainActivity`, route a tap from both entry paths:

```kotlin
override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleNotificationIntent(intent)
}

override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    setIntent(intent)
    handleNotificationIntent(intent)
}

private fun handleNotificationIntent(intent: Intent?) {
    when (intent?.getStringExtra("type")) {
        "order" -> openOrder(intent.getStringExtra("id"))
    }
}
```

There is an important FCM payload distinction: when the app is backgrounded, a payload containing a `notification` section may be displayed by the system without calling `onMessageReceived`. Use a data payload when the app must control processing, and do any larger background fetch with WorkManager. For Android 13+, request `POST_NOTIFICATIONS` from an activity after a short priming explanation, not from the messaging service or unconditionally at app launch.

