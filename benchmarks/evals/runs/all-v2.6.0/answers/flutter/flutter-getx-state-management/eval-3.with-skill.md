`Get.snackbar` is a GetX API, so a `GetxController` can show an error without receiving or storing a `BuildContext`.

```dart
import 'package:get/get.dart';

abstract class ProfileRepository {
  Future<void> updateDisplayName(String displayName);
}

class ProfileController extends GetxController {
  ProfileController(this._repository);

  final ProfileRepository _repository;
  final isSaving = false.obs;

  Future<void> saveDisplayName(String displayName) async {
    isSaving.value = true;

    try {
      await _repository.updateDisplayName(displayName);
    } catch (_) {
      Get.snackbar(
        'Profile update failed',
        'Please check your connection and try again.',
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isSaving.value = false;
    }
  }
}
```

Register the controller in a `Bindings` class and invoke `saveDisplayName` from a view event. The controller owns the API call and reactive saving state; the view need not pass `BuildContext` into business logic. Ensure the app uses GetX navigation/app setup (such as `GetMaterialApp`) so GetX can display its snackbar overlay.

