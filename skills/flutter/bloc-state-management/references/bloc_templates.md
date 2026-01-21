# BLoC Templates

## Freezed Implementation (Recommended)

### State with Union (`feature_state.dart`)

```dart
part of 'feature_bloc.dart';

@freezed
abstract class FeatureState with _$FeatureState {
  const factory FeatureState.initial() = _Initial;
  const factory FeatureState.loading() = _Loading;
  const factory FeatureState.success(List<Data> data) = _Success;
  const factory FeatureState.failure(Failure failure) = _Failure;
}
```

### State with Flat State (`feature_state.dart`)

```dart
part of 'feature_bloc.dart';

@freezed
abstract class FeatureState with _$FeatureState {
  const factory FeatureState({
    required List<Data> data,
    required Failure failure,
    required bool isLoading,
  }) = _FeatureState_;

}
```

### Event (`feature_event.dart`)

```dart
part of 'feature_bloc.dart';

@freezed
abstract class FeatureEvent with _$FeatureEvent {
  const factory FeatureEvent.started() = _Started;
  const factory FeatureEvent.refreshRequested() = _RefreshRequested;
}
```

### BLoC (`feature_bloc.dart`)

```dart
@injectable
class FeatureBloc extends Bloc<FeatureEvent, FeatureState> {
  final FeatureRepository _repository;

  FeatureBloc(this._repository) : super(const FeatureState.initial()) {
    on<_Started>(_onStarted);
  }

  Future<void> _onStarted(_Started event, Emitter<FeatureState> emit) async {
    emit(const FeatureState.loading());
    final result = await _repository.getData();
    result.fold(
      (failure) => emit(FeatureState.failure(failure)),
      (data) => emit(FeatureState.success(data)),
    );
  }
}
```

## Equatable Implementation (Alternative)

### State

```dart
sealed class FeatureState extends Equatable {
  const FeatureState();
  @override
  List<Object?> get props => [];
}

final class FeatureInitial extends FeatureState {}
final class FeatureLoading extends FeatureState {}

final class FeatureSuccess extends FeatureState {
  final List<Data> data;
  const FeatureSuccess(this.data);
  @override
  List<Object?> get props => [data];
}
```
