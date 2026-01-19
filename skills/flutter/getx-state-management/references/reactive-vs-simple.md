# Reactive vs. Simple State Management

GetX provides two ways to manage state. Choose based on complexity and performance needs.

## 1. Reactive (.obs + Obx)

Best for: Highly interactive UIs, streams, and granular updates.

```dart
class UserController extends GetxController {
  final name = "Guest".obs;
  final age = 18.obs;

  void updateName(String newName) => name.value = newName;
}

// UI
Obx(() => Text(controller.name.value));
```

### 2. Simple state management

Best for: Large objects, low-frequency updates, or reducing memory overhead of many streams.

```dart
class UserController extends GetxController {
  String name = "Guest";

  void updateName(String newName) {
    name = newName;
    update(); // Manually notify listeners
  }
}

// UI
GetBuilder<UserController>(
  builder: (controller) => Text(controller.name),
);
```
