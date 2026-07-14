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

class UserBinding extends Bindings {
  @override
  void dependencies() {
    Get.lazyPut<UserController>(
      () => UserController(Get.find<UserRepository>()),
    );
  }
}
```

The UI obtains the controller from the route binding and reacts only to its observable state:

```dart
class UserView extends GetView<UserController> {
  const UserView({super.key});

  @override
  Widget build(BuildContext context) {
    return Obx(() {
      if (controller.isLoading.value) {
        return const Center(child: CircularProgressIndicator());
      }

      final profile = controller.user.value;
      if (profile != null) {
        return Text(profile.name);
      }

      return Text(controller.errorMessage.value ?? 'No profile available.');
    });
  }
}
```

`onInit()` starts the initial fetch, `.obs`/`Rxn` make the loading and profile values reactive, and `Obx` rebuilds only when those values change. Keeping the repository and fetch logic in the controller leaves the view as UI only.

