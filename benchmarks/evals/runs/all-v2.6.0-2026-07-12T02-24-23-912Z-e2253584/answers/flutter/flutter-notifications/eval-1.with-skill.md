From scratch, the usual package set is:

- `firebase_core` — initialize Firebase first
- `firebase_messaging` — FCM token, permission, foreground/background/terminated delivery
- `flutter_local_notifications` — show local notifications, especially for foreground messages

Typical setup flow:

1. Add the packages and install native Firebase config
   - Flutter: `firebase_core`, `firebase_messaging`, `flutter_local_notifications`
   - Android: add `google-services.json`
   - iOS: add `GoogleService-Info.plist`

2. Initialize Firebase in `main()`
   - `WidgetsFlutterBinding.ensureInitialized()`
   - `await Firebase.initializeApp()`

3. Initialize local notifications
   - Create a `FlutterLocalNotificationsPlugin`
   - Define Android notification channel(s)
   - Initialize plugin with tap/click handler

4. Request notification permission
   - On iOS (and newer Android flows where relevant), show your own primer first, then call:
   - `FirebaseMessaging.instance.requestPermission(...)`

5. Register message handlers for all app states
   - Foreground: `FirebaseMessaging.onMessage.listen(...)`
     - FCM often won’t display a system banner while app is open, so use `flutter_local_notifications` to display one yourself
   - Background: `FirebaseMessaging.onBackgroundMessage(_handler)`
     - top-level/static handler
   - Terminated/opened from notification:
     - `FirebaseMessaging.instance.getInitialMessage()`
     - `FirebaseMessaging.onMessageOpenedApp.listen(...)`

6. Get and manage the FCM token
   - `await FirebaseMessaging.instance.getToken()`
   - send token to your backend
   - listen for refresh with `onTokenRefresh`

7. Validate payload data before navigation
   - If tapping a notification opens a screen, validate payload keys/IDs first instead of trusting raw data

Minimal initialization shape:

```dart
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  await Firebase.initializeApp();
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);

  final local = FlutterLocalNotificationsPlugin();
  await local.initialize(
    const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
      iOS: DarwinInitializationSettings(),
    ),
  );

  await FirebaseMessaging.instance.requestPermission();

  FirebaseMessaging.onMessage.listen((message) {
    // show local notification for foreground message
  });

  FirebaseMessaging.onMessageOpenedApp.listen((message) {
    // validate payload, then navigate
  });

  final initialMessage = await FirebaseMessaging.instance.getInitialMessage();
  if (initialMessage != null) {
    // app opened from terminated state
  }

  runApp(const MyApp());
}
```

In short: use `firebase_core + firebase_messaging + flutter_local_notifications`, initialize Firebase first, request permission thoughtfully, then handle foreground, background, and terminated notification flows explicitly.

