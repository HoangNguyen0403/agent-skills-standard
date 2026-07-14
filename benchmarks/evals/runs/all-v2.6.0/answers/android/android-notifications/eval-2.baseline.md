# Firebase Cloud Messaging in the background

Use Firebase Cloud Messaging (FCM) for transport and let Android or your app create the notification, depending on the message type.

## 1. Add Firebase to the app

Create or select a Firebase project, register the Android package name and signing certificate, download `google-services.json` into the app module, and apply the Google services plugin. Use the Firebase BoM so Firebase libraries share a compatible version:

```kotlin
dependencies {
    implementation(platform("com.google.firebase:firebase-bom:<current-version>"))
    implementation("com.google.firebase:firebase-messaging")
}
```

The exact current BoM version should come from Firebase’s release documentation rather than being hard-coded from an old example.

Declare the notification permission and the messaging service:

```xml
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

<application ...>
    <service
        android:name=".AppFirebaseMessagingService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>
</application>
```

On Android 8.0+, create the notification channel before a background notification can be displayed. On Android 13+, request `POST_NOTIFICATIONS` at an appropriate point in the UI before expecting notifications to appear.

## 2. Handle tokens and data messages

```kotlin
class AppFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // Send the token to the authenticated app server over HTTPS.
    }

    override fun onMessageReceived(message: RemoteMessage) {
        super.onMessageReceived(message)

        // This is called for data messages, including when the app is in
        // the background in supported conditions. Do not do long work here.
        val title = message.data["title"] ?: "Update"
        val body = message.data["body"] ?: return
        val intent = Intent(this, MainActivity::class.java).apply {
            putExtra("destination", message.data["destination"])
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, "general")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()

        NotificationManagerCompat.from(this)
            .notify(message.messageId?.hashCode() ?: System.currentTimeMillis().toInt(), notification)
    }
}
```

Persist or send the token to the server whenever `onNewToken()` runs; tokens can rotate. Do not trust arbitrary data from a message to launch unsafe intents or perform privileged actions. For work that may take more than a short amount of time, enqueue WorkManager work from the callback instead of doing network or database processing synchronously.

## 3. Choose the correct FCM payload

For ordinary user-visible alerts, send a `notification` payload. When the app is backgrounded, Google Play services/Android places it in the system tray, so `onMessageReceived()` is normally not called. When the user taps it, the launcher activity receives the extras; handle the deep link in the activity’s intent, including `onNewIntent()` when the activity is reused.

For app-controlled handling, send a data-only payload. That invokes `onMessageReceived()` in the background when delivery is allowed, and the service must build the notification itself. Delivery is still subject to Doze, app standby, force-stop behavior, OEM restrictions, and FCM priority rules; high priority should be reserved for time-sensitive, user-visible events and is not a guarantee of unrestricted execution.

A typical HTTP v1 request is shaped like this:

```json
{
  "message": {
    "token": "DEVICE_FCM_TOKEN",
    "data": {
      "title": "New message",
      "body": "You have a new message",
      "destination": "inbox"
    },
    "android": {
      "priority": "HIGH"
    }
  }
}
```

Send this from a trusted server using Firebase service-account authentication; never embed server credentials in the APK. If using a notification payload instead, set its Android channel ID to a channel that the app has already created, and configure the click action/deep-link data explicitly.

Test with the app foregrounded, backgrounded, swiped away, in Doze, and after a process restart. Check Logcat, the FCM send response, notification permission, channel settings, and the device’s battery/OEM background restrictions when a test does not arrive.

