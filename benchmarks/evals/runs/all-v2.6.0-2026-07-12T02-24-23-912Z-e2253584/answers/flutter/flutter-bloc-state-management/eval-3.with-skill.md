The error comes from calling `.then()` on `emit(...)`. In BLoC, `emit` is synchronous and returns `void`, so chaining `.then()` causes a bad-state style failure and breaks the expected emission flow.

Incorrect:

```dart
emit(state + 1).then((_) => print('done'));
```

Correct minimal fix:

```dart
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<CounterIncrementPressed>(_onIncrementPressed);
  }

  void _onIncrementPressed(
    CounterIncrementPressed event,
    Emitter<int> emit,
  ) {
    emit(state + 1);
    print('done');
  }
}
```

If you do not need events yet and only want a Cubit-style counter, that is even cleaner:

```dart
class CounterCubit extends Cubit<int> {
  CounterCubit() : super(0);

  void increment() {
    emit(state + 1);
    print('done');
  }
}
```

Why this fix matches correct BLoC usage:

- `emit` must not be chained with `.then()`.
- Use `await` only around real asynchronous work, then call `emit(...)`.
- State changes should happen inside registered event handlers for `Bloc`, using `on<Event>`.
- For a simple increment-only state holder, `Cubit` is often more appropriate than a full `Bloc`.

If the increment actually depends on async work, structure it like this:

```dart
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  CounterBloc(this._repository) : super(const CounterState.initial()) {
    on<CounterIncrementPressed>(_onIncrementPressed);
  }

  final CounterRepository _repository;

  Future<void> _onIncrementPressed(
    CounterIncrementPressed event,
    Emitter<CounterState> emit,
  ) async {
    emit(const CounterState.loading());

    try {
      final nextValue = await _repository.increment(state.value);
      emit(CounterState.success(value: nextValue));
    } catch (error, stackTrace) {
      addError(error, stackTrace);
      emit(const CounterState.failure(message: 'Unable to increment counter'));
    }
  }
}
```

Recommended event/state shape with `@freezed`:

```dart
@freezed
class CounterEvent with _$CounterEvent {
  const factory CounterEvent.incrementPressed() = CounterIncrementPressed;
}

@freezed
class CounterState with _$CounterState {
  const factory CounterState.initial({@Default(0) int value}) = _Initial;
  const factory CounterState.loading({@Default(0) int value}) = _Loading;
  const factory CounterState.success({required int value}) = _Success;
  const factory CounterState.failure({
    @Default(0) int value,
    required String message,
  }) = _Failure;
}
```

And the expected tests:

```dart
blocTest<CounterCubit, int>(
  'emits incremented value',
  build: CounterCubit.new,
  act: (cubit) => cubit.increment(),
  expect: () => [1],
);
```

or, for full bloc flow:

```dart
blocTest<CounterBloc, CounterState>(
  'emits loading then success when increment succeeds',
  build: () {
    when(() => repository.increment(0)).thenAnswer((_) async => 1);
    return CounterBloc(repository);
  },
  act: (bloc) => bloc.add(const CounterEvent.incrementPressed()),
  expect: () => [
    const CounterState.loading(value: 0),
    const CounterState.success(value: 1),
  ],
);
```

Bottom line: remove `.then()` from `emit`, move mutation into an `on<Event>` handler for `Bloc`, and prefer `Cubit` if the feature is just a simple counter with no event coordination.

