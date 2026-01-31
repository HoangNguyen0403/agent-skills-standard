# Android Notification Implementation

## 1. Setup

```kotlin
// build.gradle (app)
dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging-ktx'
}
```

## 2. Firebase Messaging Service

```kotlin
class MyFirebaseMessagingService : FirebaseMessagingService() {
    override fun onNewToken(token: String) {
        // Send to backend
    }

    override fun onMessageReceived(message: RemoteMessage) {
        message.notification?.let {
            showNotification(it.title, it.body, message.data)
        }
    }

    private fun showNotification(title: String?, body: String?, data: Map<String, String>) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
            putExtra("type", data["type"])
            putExtra("id", data["id"])
        }
        val pendingIntent = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_IMMUTABLE)

        val notification = NotificationCompat.Builder(this, "default")
            .setContentTitle(title)
            .setContentText(body)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(this).notify(1, notification)
    }
}
```

## 3. Manifest Declaration

```xml
<service android:name=".MyFirebaseMessagingService" android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>
```

## 4. Channels & Permissions (Android 13+)

```kotlin
// Create Channel (Android 8+)
fun createNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val channel = NotificationChannel("default", "Notifications", NotificationManager.IMPORTANCE_HIGH)
        context.getSystemService(NotificationManager::class.java).createNotificationChannel(channel)
    }
}

// Request Permission (Android 13+)
val requestPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted -> }

fun requestNotificationPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
         if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
             requestPermissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
         }
    }
}
```

## 5. Handle Taps

```kotlin
override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    val type = intent?.getStringExtra("type")
    if (type == "order") { /* Navigate */ }
}
```

## 6. Priming

```kotlin
fun primePermission(context: Context) {
    AlertDialog.Builder(context)
        .setTitle("Enable Notifications?")
        .setPositiveButton("Yes") { _, _ -> requestNotificationPermission() }
        .show()
}
```
