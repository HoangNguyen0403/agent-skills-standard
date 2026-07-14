Not quite. Catching broad `Exception` and emitting `e.toString()` works as a fallback, but it is usually too generic for a good Flutter BLoC error-handling design.

Problems with that approach:

- it mixes technical error details into UI state
- `e.toString()` often produces unfriendly or unstable messages
- different failures like no internet, validation failure, unauthorized, and server error all get flattened into one bucket
- broad catches can hide mistakes that should be fixed during development

A better approach is:

1. Catch specific failures where possible.
2. Convert low-level exceptions into app/domain failure types.
3. Emit a typed error state or a state containing a safe user-facing message.
4. Keep logs or stack traces for debugging, but do not show raw exception text to users.

Example pattern:

```dart
try {
  emit(const LoginLoading());

  final user = await repository.login(email, password);

  emit(LoginSuccess(user));
} on AuthFailure catch (e) {
  emit(LoginError(message: e.message));
} on NetworkFailure {
  emit(const LoginError(message: 'No internet connection. Please try again.'));
} on ServerFailure {
  emit(const LoginError(message: 'Server error. Please try again later.'));
} catch (e, st) {
  // log e and st
  emit(const LoginError(message: 'Unexpected error. Please try again.'));
}
```

So the short answer is:

- acceptable as a temporary baseline: yes
- ideal long-term approach: no

Prefer structured failures plus user-safe messages instead of `Exception` + `e.toString()`.

