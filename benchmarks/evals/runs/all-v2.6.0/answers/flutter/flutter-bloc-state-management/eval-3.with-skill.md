`emit()` is not a `Future`, and BLoC state must be emitted inside an `on<Event>` handler.

```dart
sealed class CounterEvent {}

final class CounterIncremented extends CounterEvent {}

class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<CounterIncremented>((event, emit) {
      emit(state + 1);
      print('done');
    });
  }

  void increment() => add(CounterIncremented());
}
```

Remove `.then()`. If the handler performs asynchronous work, use `async`/`await` before calling `emit()`.
