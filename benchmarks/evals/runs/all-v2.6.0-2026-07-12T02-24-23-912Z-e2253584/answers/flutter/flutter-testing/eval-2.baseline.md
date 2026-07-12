If `LoginScreen` creates/looks up `AuthBloc` via `BlocProvider`, the usual pattern is:

1. create a mock/fake `AuthBloc`
2. stub its `state` and `stream`
3. wrap `LoginScreen` with `BlocProvider<AuthBloc>.value(...)` in the test

Example:

```dart
class MockAuthBloc extends Mock implements AuthBloc {}

void main() {
  late MockAuthBloc mockAuthBloc;

  setUp(() {
    mockAuthBloc = MockAuthBloc();

    when(() => mockAuthBloc.state).thenReturn(AuthInitial());
    whenListen(
      mockAuthBloc,
      const Stream<AuthState>.empty(),
      initialState: AuthInitial(),
    );
  });

  testWidgets('renders login screen', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: BlocProvider<AuthBloc>.value(
          value: mockAuthBloc,
          child: const LoginScreen(),
        ),
      ),
    );

    expect(find.text('Login'), findsOneWidget);
  });
}
```

If `LoginScreen` itself instantiates the bloc internally, it is harder to mock directly. In that case, prefer refactoring the widget so the bloc is injected from outside, or provide a test-only constructor that accepts an `AuthBloc`.

