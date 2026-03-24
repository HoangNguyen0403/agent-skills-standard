---
name: react-native-notifications
description: "Push notifications for React Native using Firebase or Expo Notifications. Use when integrating push notifications with Firebase or Expo in React Native. (triggers: **/*notification*.ts, **/*notification*.tsx, **/App.tsx, Notifications, messaging, FCM, expo-notifications, react-native-firebase)"
---

# React Native Notifications

## **Priority: P1 (OPERATIONAL)**

Push notifications using React Native Firebase or Expo Notifications.

## Guidelines

- **Library**: Choose `@react-native-firebase/messaging` (Bare) or `expo-notifications` (Managed).
- **Setup**: Configure Platform channels (Android) and APNs (iOS).
- **Lifecycle**: Handle Foreground (`onMessage`), Background (`onNotificationOpenedApp`), and Quit (`getInitialNotification`) states.
- **Permissions**: Prime users before requesting system authorization.

### Example: FCM Handler Setup (React Native Firebase)

```typescript
import messaging from "@react-native-firebase/messaging";
import { useEffect } from "react";

// Request permission (call after user priming)
async function requestPermission() {
  const status = await messaging().requestPermission();
  if (status === messaging.AuthorizationStatus.AUTHORIZED) {
    const token = await messaging().getToken();
    // Send token to backend
  }
}

// Register all lifecycle handlers in App.tsx
export function useNotificationHandlers(navigate: (route: string) => void) {
  useEffect(() => {
    // Foreground
    const unsubForeground = messaging().onMessage(async (remoteMessage) => {
      console.log("Foreground message:", remoteMessage.notification?.title);
    });

    // Background tap
    const unsubBackground = messaging().onNotificationOpenedApp((remoteMessage) => {
      if (remoteMessage.data?.screen) {
        navigate(remoteMessage.data.screen);
      }
    });

    // Quit state
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage?.data?.screen) {
        navigate(remoteMessage.data.screen);
      }
    });

    return () => {
      unsubForeground();
      unsubBackground();
    };
  }, [navigate]);
}
```

## Anti-Patterns

- **No Unconditional Requests**: Spamming permission dialogs leads to high denial rates.
- **No Missing Handlers**: Forgetting "Quit" state handling results in lost deep links.
- **No Unvalidated Data**: Blindly trusting payload data causes runtime crashes.

## References

See [references/implementation.md](references/implementation.md) for FCM setup, APNs config, and lifecycle handlers.
