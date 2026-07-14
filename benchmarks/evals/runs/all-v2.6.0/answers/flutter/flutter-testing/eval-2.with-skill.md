Assume `LoginScreen` creates its bloc from GetIt:

```dart
BlocProvider(
  create: (_) => getIt<AuthBloc>(),
  child: const LoginScreenView(),
)
```

Register a shared mock before the widget is built:

```dart
// test/shared/mocks.dart
class MockAuthBloc extends Mock implements AuthBloc {}
```

```dart
late MockAuthBloc authBloc;

setUpAll(() {
  TestWrapper.init();

  authBloc = MockAuthBloc();
  getIt.registerFactory<AuthBloc>(() => authBloc);
});

setUp(() {
  when(() => authBloc.state).thenReturn(const AuthInitial());
  when(() => authBloc.stream).thenAnswer(
    (_) => const Stream<AuthState>.empty(),
  );
});
```

Build the screen through the project test wrapper:

```dart
Future<void> pumpScreen(
  WidgetTester tester, {
  bool settle = true,
}) async {
  await tester.pumpLocalizedWidget(const LoginScreen());

  if (settle) {
    await tester.pumpAndSettle();
  }
}
```

For state transitions, use `whenListen`:

```dart
whenListen(
  authBloc,
  Stream<AuthState>.fromIterable([
    const AuthLoading(),
    const AuthAuthenticated(),
  ]),
  initialState: const AuthInitial(),
);
```

Keep UI interactions and assertions in a robot, using `WidgetKeys` constants rather than inline `Key` values:

```dart
class LoginRobot {
  LoginRobot(this.tester);

  final WidgetTester tester;

  Future<void> tapLogin() async {
    await tester.tap(find.byKey(WidgetKeys.loginButton));
    await tester.pump();
  }

  void expectLoadingVisible() {
    expect(find.byKey(WidgetKeys.loginLoading), findsOneWidget);
  }
}
```

If `LoginScreen` constructs `AuthBloc()` directly instead of resolving it through GetIt, the mock cannot replace it externally; expose a bloc factory or constructor dependency, or change the internal `BlocProvider` to use the GetIt registration.
