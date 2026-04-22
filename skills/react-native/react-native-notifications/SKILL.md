---
name: react-native-notifications
description: Push notifications for React Native using Firebase or Expo Notifications. Use when integrating push notifications with Firebase or Expo in React Native.
metadata:
  triggers:
    files:
    - '**/*notification*.ts'
    - '**/*notification*.tsx'
    - '**/App.tsx'
    keywords:
    - Notifications
    - messaging
    - FCM
    - expo-notifications
    - react-native-firebase
---
# React Native Notifications

## **Priority: P1 (OPERATIONAL)**


## Guidelines

- **Library**: Choose `@react-native-firebase/messaging` (Bare) or `expo-notifications` (Managed).
- **Setup**: Configure Platform channels (Android) and APNs (iOS).
- **Lifecycle**: Handle Foreground (`onMessage`), Background (`onNotificationOpenedApp`), and Quit (`getInitialNotification`) states.
- **Permissions**: Prime users before requesting system authorization.

See [implementation examples](references/implementation.md) for complete FCM handler setup with permission request and lifecycle handlers.

## Anti-Patterns

- **No Unconditional Requests**: Spamming permission dialogs leads to high denial rates.
- **No Missing Handlers**: Forgetting "Quit" state handling results in lost deep links.
- **No Unvalidated Data**: Blindly trusting payload data causes runtime crashes.

## References

See [references/implementation.md](references/implementation.md) for FCM setup, APNs config, and lifecycle handlers.