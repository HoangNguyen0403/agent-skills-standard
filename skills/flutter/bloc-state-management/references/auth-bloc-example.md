# Auth BLoC Full Implementation

## **Events (@freezed)**

```dart
@freezed
class AuthEvent with _$AuthEvent {
  const factory AuthEvent.started() = _Started;
  const factory AuthEvent.loginSubmitted(String email, String password) = _LoginSubmitted;
  const factory AuthEvent.logoutPressed() = _LogoutPressed;
}
```

## **States (@freezed)**

```dart
@freezed
class AuthState with _$AuthState {
  const factory AuthState.initial() = _Initial;
  const factory AuthState.loading() = _Loading;
  const factory AuthState.authenticated(User user) = _Authenticated;
  const factory AuthState.unauthenticated() = _Unauthenticated;
  const factory AuthState.error(String message) = _Error;
}
```

## **BLoC Implementation**

```dart
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final IAuthRepository _repository;

  AuthBloc(this._repository) : super(const AuthState.initial()) {
    on<_LoginSubmitted>(_onLogin);
    on<_LogoutPressed>(_onLogout);
  }

  Future<void> _onLogin(_LoginSubmitted event, Emitter<AuthState> emit) async {
    emit(const AuthState.loading());
    final result = await _repository.login(event.email, event.password);
    result.fold(
      (failure) => emit(AuthState.error(failure.message)),
      (user) => emit(AuthState.authenticated(user)),
    );
  }

  Future<void> _onLogout(_LogoutPressed event, Emitter<AuthState> emit) async {
    await _repository.logout();
    emit(const AuthState.unauthenticated());
  }
}
```
