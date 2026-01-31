# iOS Notification Patterns (UserNotifications)

## 1. Request Permission

```swift
import UserNotifications

func requestNotificationPermission() {
    UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
        if granted {
            DispatchQueue.main.async { UIApplication.shared.registerForRemoteNotifications() }
        }
    }
}
```

## 2. Register for APNS (AppDelegate)

```swift
func application(_ app: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
    print("APNS Token: \(token)")
}

func application(_ app: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register: \(error)")
}
```

## 3. Handle Notifications (Delegate)

```swift
extension AppDelegate: UNUserNotificationCenterDelegate {
    // Foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    // Tapped
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        if let type = userInfo["type"] as? String {
             // NotificationCenter.default.post(...)
        }
        completionHandler()
    }
}
```

## 4. Local Notifications

```swift
func scheduleLocal() {
    let content = UNMutableNotificationContent()
    content.title = "Reminder"
    content.sound = .default
    let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 3600, repeats: false)
    let request = UNNotificationRequest(identifier: UUID().uuidString, content: content, trigger: trigger)
    UNUserNotificationCenter.current().add(request)
}
```

## 5. Priming

```swift
func primePermission() {
    let alert = UIAlertController(title: "Enable?", message: "Stay updated...", preferredStyle: .alert)
    alert.addAction(UIAlertAction(title: "Yes", style: .default) { _ in requestNotificationPermission() })
    alert.addAction(UIAlertAction(title: "No", style: .cancel))
    // present(alert)
}
```
