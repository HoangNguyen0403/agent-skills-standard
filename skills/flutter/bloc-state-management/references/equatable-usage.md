# BLoC with Equatable

Use `Equatable` as a lightweight alternative to `freezed` for state and event comparison.

```dart
import 'package:equatable/equatable.dart';

// --- Event ---
abstract class CounterEvent extends Equatable {
  const CounterEvent();

  @override
  List<Object?> get props => [];
}

class IncrementPressed extends CounterEvent {
  final int amount;
  const IncrementPressed(this.amount);

  @override
  List<Object?> get props => [amount];
}

// --- State ---
class CounterState extends Equatable {
  final int count;
  final bool isSubmitting;

  const CounterState({
    required this.count,
    this.isSubmitting = false,
  });

  CounterState copyWith({
    int? count,
    bool? isSubmitting,
  }) {
    return CounterState(
      count: count ?? this.count,
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }

  @override
  List<Object?> get props => [count, isSubmitting];
}
```

## When to use Equatable over Freezed

- **Library Presence**: Primary choice when `equatable` is present in `pubspec.yaml` and code generation is not desired.
- **Minimal Dependencies**: When you want to avoid code generation (build_runner).
- **Simple Comparison**: When states don't have many properties or union cases.
- **Legacy Projects**: maintaining older codebases that already utilize Equatable.

> **Note**: For complex applications, `@freezed` is still prioritized due to exhaustive switch cases and built-in `copyWith` safety.
