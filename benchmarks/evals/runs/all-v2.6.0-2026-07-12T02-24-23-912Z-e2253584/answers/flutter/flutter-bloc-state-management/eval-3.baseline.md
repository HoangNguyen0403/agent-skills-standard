The problem is that `emit` should not be called from an arbitrary public method on `Bloc`, and it does not return a `Future`, so chaining `.then(...)` is invalid. In `bloc`, state changes should happen inside an event handler.

A correct version is:

```dart
import 'package:bloc/bloc.dart';

sealed class CounterEvent {}

class CounterIncrementPressed extends CounterEvent {}

class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<CounterIncrementPressed>((event, emit) {
      emit(state + 1);
      print('done');
    });
  }
}
```

And trigger it like this:

```dart
context.read<CounterBloc>().add(CounterIncrementPressed());
```

Why the original code fails:

- `emit` is intended for use inside the callback passed to `on<Event>()`
- calling `emit` from `increment()` can lead to a bad state error because it bypasses the normal event-processing flow
- `emit(state + 1)` returns `void`, not `Future`, so `.then(...)` is also incorrect

If you want to keep an `increment()` helper, make it dispatch an event instead of emitting directly:

```dart
class CounterBloc extends Bloc<CounterEvent, int> {
  CounterBloc() : super(0) {
    on<CounterIncrementPressed>((event, emit) {
      emit(state + 1);
      print('done');
    });
  }

  void increment() {
    add(CounterIncrementPressed());
  }
}
```

That preserves the proper BLoC pattern and avoids the bad state error.

