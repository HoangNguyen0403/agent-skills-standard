Use `ref.listen()` in the widget layer to react to provider state changes and perform navigation as a side effect. Keep navigation out of the provider/notifier itself.

```dart
@riverpod
class AuthController extends _$AuthController {
  @override
  AsyncValue<User?> build() => const AsyncData(null);

  Future<void> signIn() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return User(id: '1');
    });
  }
}

class LoginPage extends ConsumerWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    ref.listen<AsyncValue<User?>>(authControllerProvider, (previous, next) {
      next.whenOrNull(
        data: (user) {
          if (user != null) {
            Navigator.of(context).pushReplacementNamed('/home');
          }
        },
      );
    });

    final authState = ref.watch(authControllerProvider);

    return Scaffold(
      body: Center(
        child: ElevatedButton(
          onPressed: authState.isLoading
              ? null
              : () => ref.read(authControllerProvider.notifier).signIn(),
          child: const Text('Sign in'),
        ),
      ),
    );
  }
}
```

Why this is the Riverpod way:

- `ref.watch()` is for reactive UI rebuilds.
- `ref.listen()` is for one-off side effects like navigation, dialogs, and snackbars.
- The notifier stays UI-agnostic and does not depend on `BuildContext`.

Avoid:

- Calling `Navigator` inside a provider/notifier.
- Passing `BuildContext` into a notifier.
- Triggering navigation during provider initialization.

