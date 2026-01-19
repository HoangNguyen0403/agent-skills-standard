# Architecture & Layers

## 1. Data Layer: Repository Interface & Providers

Always separate interface from implementation to enable easy mocking.

```dart
// domain/repository/user_repository.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../data/repository/api_user_repository.dart';
import '../models/user.dart';

part 'user_repository.g.dart';

// 1. Define the Provider returning the INTERFACE
@riverpod
UserRepository userRepository(UserRepositoryRef ref) {
  // Return the specific implementation here.
  // Can be swapped for MockUserRepository based on environment flags.
  return ApiUserRepository(ref.watch(apiClientProvider));
}

// 2. Define the Interface
abstract interface class UserRepository {
  Future<List<User>> getAllUsers();
  Future<void> deleteUser(String id);
}
```

```dart
// data/repository/api_user_repository.dart
class ApiUserRepository implements UserRepository {
  final UserApiClient _client;

  ApiUserRepository(this._client);

  @override
  Future<List<User>> getAllUsers() async {
    return _client.fetchUsers();
  }
}
```

## 2. Presentation Layer: AsyncNotifier Controller

Use `AsyncNotifier` (via `@riverpod` class) to handle loading/error/data states naturally.

```dart
// features/users/user_controller.dart
import 'package:riverpod_annotation/riverpod_annotation.dart';
import '../../domain/repository/user_repository.dart';
import '../../domain/models/user.dart';

part 'user_controller.g.dart';

@riverpod
class UserController extends _$UserController {
  @override
  FutureOr<List<User>> build() async {
    // 1. Fetch initial data
    return ref.watch(userRepositoryProvider).getAllUsers();
  }

  // 2. Mutation Methods
  Future<void> deleteUser(String id) async {
    // Set loading state (optional, for optimisic UI usually prefer local)
    // state = const AsyncLoading();

    // Perform action
    state = await AsyncValue.guard(() async {
      await ref.read(userRepositoryProvider).deleteUser(id);
      // Refresh logic:
      // Option A: Refetch everything
      return ref.refresh(userRepositoryProvider).getAllUsers();

      // Option B: Optimistic Update (Better performance)
      // final currentList = state.requireValue;
      // return currentList.where((u) => u.id != id).toList();
    });
  }
}
```

## 3. UI Layer: ConsumerWidget

Handle all 3 states (`data`, `loading`, `error`) using `.when`.

```dart
// features/users/user_list_screen.dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

class UserListScreen extends ConsumerWidget {
  const UserListScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 1. Watch the Notifier Provider
    final state = ref.watch(userControllerProvider);

    return Scaffold(
      body: state.when(
        data: (users) => ListView.builder(
          itemCount: users.length,
          itemBuilder: (ctx, index) {
            final user = users[index];
            return ListTile(
              title: Text(user.name),
              // 2. Call mutation methods via .read()
              trailing: IconButton(
                icon: const Icon(Icons.delete),
                onPressed: () {
                  ref.read(userControllerProvider.notifier).deleteUser(user.id);
                },
              ),
            );
          },
        ),
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (err, st) => Center(child: Text('Error: $err')),
      ),
    );
  }
}
```
