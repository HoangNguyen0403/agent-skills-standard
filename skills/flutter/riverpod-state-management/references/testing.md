# Testing with Riverpod

Riverpod is designed for testability. You do not need complex dependency injection containers; you simply "override" providers in the test scope.

## Unit Testing (Notifiers)

Test notifiers in isolation using a `ProviderContainer`.

```dart
test('increment adds 1 to state', () {
  // 1. Create container
  final container = ProviderContainer();
  addTearDown(container.dispose);

  // 2. Listen to provider (required to initialize it)
  container.listen(counterProvider, (_, __) {});

  // 3. Act
  container.read(counterProvider.notifier).increment();

  // 4. Assert
  expect(container.read(counterProvider), 1);
});
```

## Widget/Integration Testing (Overrides)

When testing widgets, wrap them in a `ProviderScope` and override the repository providers with mocks.

```dart
testWidgets('shows loading then data', (tester) async {
  final mockRepo = MockUserRepository();
  when(() => mockRepo.getAllUsers()).thenAnswer((_) async => [User(id: 1, name: 'Bob')]);

  await tester.pumpWidget(
    ProviderScope(
      overrides: [
        // 🔑 Replace the REAL repository with the MOCK
        userRepositoryProvider.overrideWithValue(mockRepo),
      ],
      child: const MaterialApp(home: UserListScreen()),
    ),
  );

  // Assert Loading
  expect(find.byType(CircularProgressIndicator), findsOneWidget);

  // Assert Data
  await tester.pumpAndSettle();
  expect(find.text('Bob'), findsOneWidget);
});
```

## Mocking `AsyncNotifiers`

Sometimes you want to mock the _entire_ Controller/Notifier state, not just the repository.

```dart
// 1. Extend the generated class (or create a mock)
class MockUserController extends AutoDisposeAsyncNotifier<List<User>>
    implements UserController {
  @override
  FutureOr<List<User>> build() => [];
}

// 2. Override in ProviderScope
ProviderScope(
  overrides: [
    userControllerProvider.overrideWith(() => MockUserController()),
  ],
  child: ...
)
```
