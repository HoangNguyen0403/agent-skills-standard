# Property-Based State Pattern (Forms & Complex Data)

This pattern uses a single data class to maintain the entire state of a feature. It is the preferred approach for forms, multi-step wizards, and screens with persistent filtering.

## **Pattern Implementation**

```dart
@freezed
class NewRequestState with _$NewRequestState {
  const factory NewRequestState({
    // 1. Feature Data
    required List<ReturnMaterial> selectedItems,
    required String returnReference,
    required SalesOrg salesOrg,
    
    // 2. UI Flags
    required bool showErrorMessages,
    required bool isSubmitting,
    
    // 3. Functional Communication (Failure/Success)
    // - None: Operation not started
    // - Some(Left): Operation failed
    // - Some(Right): Operation succeeded
    required Option<Either<ApiFailure, String>> failureOrSuccessOption,
  }) = _NewRequestState;

  factory NewRequestState.initial() => NewRequestState(
    selectedItems: [],
    returnReference: '',
    salesOrg: SalesOrg.empty(),
    showErrorMessages: false,
    isSubmitting: false,
    failureOrSuccessOption: none(),
  );
}
```

## **When to use this vs. Union States?**

### **1. Use Property-Based (Flat) State when:**

- **Preservation is key**: You are building a **Form** or a **wizard** where users enter data. If you used a Union `Loading` state, the user's current input would be lost unless passed forward manually.
- **Overlapping UI**: You need to show a loading indicator *on top* of existing data (e.g., a "loading" overlay on a list).
- **Complex Filtering**: Multiple filters (search, date, category) that all need to persist.

### **2. Use Union States (Sealed Classes) when:**

- **Exclusive Phases**: The screen looks completely different in each state (e.g., Login Screen -> Loading Spinner -> Dashboard).
- **Simple Lifecycle**: Fetch data once -> Display it. No complex user input involved.
- **Type Safety**: The UI *must* have data in the `Success` state and *must not* have it in `Initial`.

## **UI Consumption (Option/Either)**

```dart
BlocListener<NewRequestBloc, NewRequestState>(
  listenWhen: (p, c) => p.failureOrSuccessOption != c.failureOrSuccessOption,
  listener: (context, state) {
    state.failureOrSuccessOption.fold(
      () => null, // Do nothing
      (either) => either.fold(
        (failure) => showErrorSnackbar(failure.message),
        (success) => navigateToSummary(),
      ),
    );
  },
  child: ...,
)
```
