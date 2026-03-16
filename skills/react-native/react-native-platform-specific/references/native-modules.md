# Native Modules Reference

Bridge between JavaScript and Native (Swift/Kotlin).

## Native Module (Bare RN)

### Android (Kotlin)

```kotlin
// CalendarModule.kt
class CalendarModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {
    override fun getName() = "CalendarModule"

    @ReactMethod
    fun createCalendarEvent(name: String, location: String) {
        Log.d("CalendarModule", "Create event $name at $location")
    }
}
```

### iOS (Swift)

```swift
// CalendarModule.swift
@objc(CalendarModule)
class CalendarModule: NSObject {
  @objc(createCalendarEvent:location:)
  func createCalendarEvent(name: String, location: String) -> Void {
    print("Create event \(name) at \(location)")
  }

  @objc static func requiresMainQueueSetup() -> Bool { return true }
}
```

## Expo Native Modules (JSI)

Expo Modules API uses JSI for near-instant synchronous calls.

```tsx
// src/modules/MyModule.ts
import { requireNativeModule } from 'expo-modules-core';
const module = requireNativeModule('MyModule');

export function hello() {
  return module.hello(); // Synchronous call
}
```

## Platform-Specific Rendering

### Injections & Overrides

```tsx
// DatePicker.ios.tsx
export const DatePicker = (props) => (
  <DateTimePicker mode='date' display='spinner' {...props} />
);

// DatePicker.android.tsx
export const DatePicker = (props) => (
  <DateTimePicker mode='date' display='default' {...props} />
);
```

### Safe Area Handling

```tsx
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function SafeHeader() {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: insets.top }}>
      <Header />
    </View>
  );
}
```
