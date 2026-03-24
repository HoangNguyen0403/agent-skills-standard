---
name: ios-notifications
description: "Push notifications for iOS using UserNotifications framework and APNS. Use when integrating APNS push notifications in iOS applications. (triggers: **/*Notification*.swift, **/*AppDelegate.swift, UNUserNotificationCenter, APNS, UNNotificationRequest, deviceToken)"
---

# iOS Notifications

## **Priority: P2 (OPTIONAL)**

Push notifications using UserNotifications framework and APNs.

## Guidelines

- **Framework**: Use `UserNotifications` for all notification handling.
- **Delegate**: Implement `UNUserNotificationCenterDelegate` for foreground & tap handling.
- **Permissions**: Request `.alert`, `.badge`, `.sound` after priming the user.
- **APNs**: Register for remote notifications in `AppDelegate`.
- **Badges**: Manage app icon badges manually (set to 0 to clear).

### Example: APNs Registration and Permission Request

```swift
// AppDelegate.swift
import UserNotifications

class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        requestNotificationPermission()
        return true
    }

    func requestNotificationPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            guard granted else { return }
            DispatchQueue.main.async {
                UIApplication.shared.registerForRemoteNotifications()
            }
        }
    }

    func application(_ application: UIApplication,
                     didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        // Send token to your backend
    }

    // Foreground handling
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification) async -> UNNotificationPresentationOptions {
        return [.banner, .sound, .badge]
    }
}
```

## Anti-Patterns

- **No Unconditional Requests**: Explain value proposition before system dialog.
- **No Missing Delegate**: Notifications won't trigger foreground callbacks without it.
- **No Forgotten Badge Clear**: User frustration increases if badges persist.

## References

- [Implementation Details](references/implementation.md)
