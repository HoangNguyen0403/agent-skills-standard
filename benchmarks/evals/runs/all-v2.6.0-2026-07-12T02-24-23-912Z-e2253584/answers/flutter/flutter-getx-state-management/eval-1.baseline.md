Use a `GetxController` as the state owner. Trigger the initial request from `onInit`, keep request state in observable fields, and have the UI rebuild only where it reads those fields.

```dart
import 'package:get/get.dart';

class UserProfile {
  const UserProfile({required this.id, required this.name});

  final String id;
  final String name;
}

abstract class UserRepository {
  Future<UserProfile> fetchProfile();
}

class UserController extends GetxController {
  UserController(this._repository);

  final UserRepository _repository;

  final isLoading = false.obs;
  final user = Rxn<UserProfile>();
  final errorMessage = RxnString();

  @override
  void onInit() {
    super.onInit();
    loadProfile();
  }

  Future<void> loadProfile() async {
    isLoading.value = true;
    errorMessage.value = null;

    try {
      user.value = await _repository.fetchProfile();
    } catch (_) {
      errorMessage.value = 'Unable to load your profile.';
    } finally {
      isLoading.value = false;
    }
  }
}
```

Register the controller where its dependencies are available, preferably through a binding:

```dart
class ProfileBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<UserRepository>(() => ApiUserRepository());
    Get.lazyPut(() => UserController(Get.find()));
  }
}
```

Then render it with `Obx`:

```dart
class ProfilePage extends GetView<UserController> {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (controller.isLoading.value && controller.user.value == null) {
        return const Center(child: CircularProgressIndicator());
      }

      final profile = controller.user.value;
      if (profile == null) {
        return Center(
          child: ElevatedButton(
            onPressed: controller.loadProfile,
            child: Text(controller.errorMessage.value ?? 'Retry'),
          ),
        );
      }

      return Text('Hello, ${profile.name}');
    });
  }
}
```

Do not call `loadProfile` from `build`; builds can run repeatedly. `onInit` runs once for a controller instance, while the public `loadProfile` method also supports pull-to-refresh or retry.

