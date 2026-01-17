# BLoC Testing with `bloc_test`

`blocTest` ensures your events trigger the correct sequence of states.

## **Success Scenario**

```dart
blocTest<AuthBloc, AuthState>(
  'emits [loading, authenticated] when login is successful',
  build: () {
    // Stub the repository
    when(() => mockAuthRepo.login(any(), any()))
        .thenAnswer((_) async => Right(mockUser));
    return AuthBloc(mockAuthRepo);
  },
  act: (bloc) => bloc.add(const AuthEvent.loginPressed('test@email.com', 'pass123')),
  expect: () => [
    const AuthState.loading(),
    AuthState.authenticated(mockUser),
  ],
  verify: (_) {
    verify(() => mockAuthRepo.login('test@email.com', 'pass123')).called(1);
  },
);
```

## **Best Practices & Pitfalls**

- **Do not mock based on State**: Do not use values in the BLoC state to mock data or verify calls. This is unreliable because it tracks the number of times a state is emitted (which can happen multiple times) rather than verifying the actual event trigger. Always verify the downstream Dependency/Service call in the `verify` block.
- **Initial State verification**

Always ensure your BLoC doesn't emit anything just by being created unless specified.

```dart
test('initial state is AuthState.initial', () {
  expect(AuthBloc(mockRepo).state, const AuthState.initial());
});
```
