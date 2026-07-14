To set up FCM push notifications in Flutter from scratch, you typically need:

- `firebase_core`
- `firebase_messaging`

Optional, but common:

- `flutter_local_notifications` for showing notifications while the app is in the foreground

Basic initialization flow:

1. Create a Firebase project.
2. Add Android and/or iOS apps in Firebase.
3. Download platform config files:
   - Android: `google-services.json`
   - iOS: `GoogleService-Info.plist`
4. Add the Firebase packages to `pubspec.yaml`.
5. Initialize Firebase in `main()` before running the app.
6. Request notification permissions, especially on iOS.
7. Set up a background message handler.
8. Listen for foreground and opened-app notification events.
9. Get the FCM registration token if needed for backend delivery.

Typical shape:

```dart
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  await FirebaseMessaging.instance.requestPermission();

  runApp(MyApp());
}
```

Then inside app startup logic:

```dart
FirebaseMessaging.onMessage.listen((RemoteMessage message) {
  // handle foreground message
});

FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
  // handle notification tap
});

final token = await FirebaseMessaging.instance.getToken();
```

Platform notes:

- Android also needs Firebase Gradle setup.
- iOS needs APNs capability and push notification support enabled in Xcode.
- If you want visible foreground notifications, pair FCM with `flutter_local_notifications`.

