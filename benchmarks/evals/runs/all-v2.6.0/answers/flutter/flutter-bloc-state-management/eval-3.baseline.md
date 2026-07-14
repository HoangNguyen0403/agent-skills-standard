```dart
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<Increment>((event, emit) {
      emit(state + 1);
      print('done');
    });
  }
}

sealed class CounterEvent {}

class Increment extends CounterEvent {}
```

Dispatch it with:

```dart
context.read<CounterBloc>().add(Increment());
```

`Bloc` state changes must occur inside an `on<Event>` handler, and `emit()` returns `void`, so it cannot be chained with `.then()`.
