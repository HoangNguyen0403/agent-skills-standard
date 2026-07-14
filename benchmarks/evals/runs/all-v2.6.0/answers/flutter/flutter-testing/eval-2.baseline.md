Refactor `LoginScreen` to accept an optional `AuthBloc`, then provide the mock in the test.

```dart
class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key, this.authBloc});

  final AuthBloc? authBloc;

  @override
  Widget build(BuildContext context) {
    return BlocProvider<AuthBloc>(
      create: (_) => authBloc ?? AuthBloc(),
      child: const _LoginView(),
    );
  }
}
```

```dart
class MockAuthBloc extends Mock implements AuthBloc {}
```

```dart
testWidgets('shows the login screen', (tester) async {
  final authBloc = MockAuthBloc();

  when(() => authBloc.state).thenReturn(AuthInitial());
  whenListen(
    authBloc,
    const Stream<AuthState>.empty(),
    initialState: AuthInitial(),
  );

  await tester.pumpWidget(
    MaterialApp(
      home: LoginScreen(authBloc: authBloc),
    ),
  );

  expect(find.byType(LoginScreen), findsOneWidget);
});
```

If `LoginScreen` already receives an `AuthBloc` from its parent, provide the mock with `BlocProvider.value`:

```dart
await tester.pumpWidget(
  MaterialApp(
    home: BlocProvider<AuthBloc>.value(
      value: authBloc,
      child: const LoginScreen(),
    ),
  ),
);
```

However, an outer provider cannot override a `BlocProvider` created internally by `LoginScreen`; the inner provider shadows it. Dependency injection through the constructor is therefore the testable approach.
