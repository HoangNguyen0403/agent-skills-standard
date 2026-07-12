If `LoginScreen` creates or resolves `AuthBloc` internally, don’t try to inject it through the widget constructor. Register a mock in `GetIt` before pumping the widget, then stub both `state` and `stream` in `setUp` so the internal `BlocProvider` picks up your mock.

Example:

```dart
late MockAuthBloc authBloc;

setUpAll(() async {
  await TestWrapper.init();
});

setUp(() {
  authBloc = MockAuthBloc();

  getIt.registerSingleton<AuthBloc>(authBloc);

  when(() => authBloc.state).thenReturn(const AuthInitial());
  whenListen(
    authBloc,
    Stream<AuthState>.fromIterable(const [AuthInitial()]),
    initialState: const AuthInitial(),
  );
});

tearDown(() async {
  await getIt.reset();
});

testWidgets('should show login screen when auth state is initial', (tester) async {
  final robot = LoginRobot(tester);

  await tester.pumpLocalizedWidget(
    robot.pumpScreen(),
  );

  await robot.expectScreenVisible();
});
```

If you need to verify transitions like loading or authenticated, keep the same setup and change the `whenListen(...)` sequence to emit the states you want to test. Also keep assertions/interactions inside a robot instead of raw `find`/`expect` calls in the test body.

