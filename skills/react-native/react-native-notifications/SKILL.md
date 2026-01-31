---
name: React Native Notifications
description: Push notifications for React Native using React Native Firebase or Expo Notifications.
metadata:
  labels: [react-native, notifications, fcm, push, expo, firebase]
  triggers:
    files: ['**/*notification*.ts', '**/*notification*.tsx', '**/App.tsx']
    keywords:
      [Notifications, messaging, FCM, expo-notifications, react-native-firebase]
---

# React Native Notifications

## **Priority: P1 (OPERATIONAL)**

Push notifications using React Native Firebase or Expo Notifications.

## Guidelines

- **Library**: Choose `@react-native-firebase/messaging` (Bare) or `expo-notifications` (Managed).
- **Setup**: Configure Platform channels (Android) and APNs (iOS).
- **Lifecycle**: Handle Foreground (`onMessage`), Background (`onNotificationOpenedApp`), and Quit (`getInitialNotification`) states.
- **Permissions**: Prime users before requesting system authorization.

[Implementation Details](references/implementation.md)

## Anti-Patterns

- **No Unconditional Requests**: Spamming permission dialogs leads to high denial rates.
- **No Missing Handlers**: Forgetting "Quit" state handling results in lost deep links.
- **No Unvalidated Data**: Blindly trusting payload data causes runtime crashes.

## Related Topics

react-native-navigation | react-native-dls | mobile-ux-core
