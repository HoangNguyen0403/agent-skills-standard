Use Apple’s `UserNotifications` framework end to end and structure it around four pieces:

1. Prime before prompting  
Explain why notifications are useful before showing the system permission dialog. Then request authorization with `.alert`, `.badge`, and `.sound`.

2. Set up the notification center delegate  
Make your app delegate or notification manager conform to `UNUserNotificationCenterDelegate`, and assign:
`UNUserNotificationCenter.current().delegate = self`

This is what enables foreground presentation handling and tap-response handling.

3. Register for APNs after permission is granted  
Once authorization succeeds, call:
`UIApplication.shared.registerForRemoteNotifications()`

Then implement:
- `didRegisterForRemoteNotificationsWithDeviceToken`
- `didFailToRegisterForRemoteNotificationsWithError`

Convert the device token to a hex string and send it to your backend.

4. Handle notification delivery states correctly  
- Foreground: implement `userNotificationCenter(_:willPresent:withCompletionHandler:)` and return presentation options like banner, sound, and badge.
- User tap: implement `userNotificationCenter(_:didReceive:withCompletionHandler:)` and route based on `userInfo`.
- Local notifications: create `UNMutableNotificationContent`, a trigger, then wrap them in `UNNotificationRequest`.

Best practices:
- Use `UserNotifications`, not older notification APIs.
- Do not request permission immediately without context.
- Always set the delegate, or foreground callbacks will not fire.
- Clear the app badge manually when appropriate, such as setting it back to `0`.
- Keep notification routing logic centralized so push taps and local notifications behave consistently.

Minimal shape:

```swift
import UserNotifications

final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print(token)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }
}
```

If you want the cleanest architecture, wrap permission requests, local scheduling, badge clearing, and deep-link routing in a dedicated notification manager, while keeping APNs registration hooks in the app delegate.

