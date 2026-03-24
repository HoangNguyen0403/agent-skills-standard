# React Native Notification Implementation

## 1. Firebase (Bare Workflow)

**Setup**: `npm install @react-native-firebase/app @react-native-firebase/messaging`

### Request Permission

```typescript
import messaging from '@react-native-firebase/messaging';

async function requestPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
  if (enabled) console.log('Token:', await messaging().getToken());
}
```

### Handlers

```typescript
useEffect(() => {
  // Foreground
  const unsubscribe = messaging().onMessage(async (msg) => {
    console.log(msg);
  });

  // Background -> Opened
  messaging().onNotificationOpenedApp((msg) => handlePress(msg));

  // Quit -> Opened
  messaging()
    .getInitialNotification()
    .then((msg) => {
      if (msg) handlePress(msg);
    });

  return unsubscribe;
}, []);

function handlePress(msg) {
  if (msg?.data?.type === 'order')
    navigation.navigate('Order', { id: msg.data.id });
}
```

## 2. Expo Notifications (Managed)

**Setup**: `npx expo install expo-notifications`

### Setup & Register

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function register() {
  if (Device.isDevice) {
    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus === 'granted') {
      const token = (await Notifications.getExpoPushTokenAsync()).data;
      console.log(token);
    }
  }
}
```

### Local Scheduling

```typescript
await Notifications.scheduleNotificationAsync({
  content: { title: 'Hello', body: 'World' },
  trigger: { seconds: 60 },
});
```

## 3. Priming Example

```typescript
async function prime() {
  const { canAskAgain } = await Notifications.getPermissionsAsync();
  if (!canAskAgain)
    return Alert.alert('Open Settings', 'Please enable manually');

  Alert.alert('Enable?', 'Receive updates?', [
    { text: 'Yes', onPress: () => Notifications.requestPermissionsAsync() },
  ]);
}
```

## 4. FCM Handler Setup (React Native Firebase)

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
