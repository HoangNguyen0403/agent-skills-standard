GetX exposes global UI helpers, so a `GetxController` can show feedback without a `BuildContext`. Catch the API error, preserve useful state for the UI, and call `Get.snackbar`.

```dart
import 'package:get/get.dart';

class ProfileController extends GetxController {
  ProfileController(this._repository);

  final ProfileRepository _repository;
  final isSaving = false.obs;

  Future<void> saveProfile(ProfileDraft draft) async {
    if (isSaving.value) return;

    isSaving.value = true;
    try {
      await _repository.save(draft);
      Get.snackbar(
        'Saved',
        'Your profile has been updated.',
        snackPosition: SnackPosition.BOTTOM,
      );
    } on ApiException catch (error) {
      Get.snackbar(
        'Could not save profile',
        error.userMessage,
        snackPosition: SnackPosition.BOTTOM,
        duration: const Duration(seconds: 4),
      );
    } catch (_) {
      Get.snackbar(
        'Could not save profile',
        'Please check your connection and try again.',
        snackPosition: SnackPosition.BOTTOM,
      );
    } finally {
      isSaving.value = false;
    }
  }
}
```

The application must use `GetMaterialApp` (rather than a plain `MaterialApp`) so GetX has the navigator and overlay support required for `Get.snackbar`:

```dart
void main() {
  runApp(GetMaterialApp(home: const ProfilePage()));
}
```

Keep the API client responsible for translating transport failures into typed exceptions such as `ApiException`. The controller should present a safe, user-facing message rather than exposing raw server errors. Use a UI-level retry action or a dedicated error state when the failure needs more than transient feedback.

