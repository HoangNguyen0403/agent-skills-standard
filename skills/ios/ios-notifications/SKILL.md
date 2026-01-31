---
name: iOS Notifications
description: Push notifications for iOS using UserNotifications framework and APNS.
metadata:
  labels: [ios, apns, notifications, push, user-notifications]
  triggers:
    files: ['**/*Notification*.swift', '**/*AppDelegate.swift']
    keywords:
      [UNUserNotificationCenter, APNS, UNNotificationRequest, deviceToken]
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

[Implementation Details](references/implementation.md)

## Anti-Patterns

- **No Unconditional Requests**: Explain value proposition before system dialog.
- **No Missing Delegate**: Notifications won't trigger foreground callbacks without it.
- **No Forgotten Badge Clear**: User frustration increases if badges persist.

## Related Topics

ios-navigation | ios-design-system | mobile-ux-core
