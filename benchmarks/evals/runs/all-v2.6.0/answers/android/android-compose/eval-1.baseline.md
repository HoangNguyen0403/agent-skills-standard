Compose recomposition is scoped: a composable should re-run when a state value it read changes, and a parent re-run does not necessarily mean the child must do work if its parameters are stable and unchanged.

Reduce unnecessary work by:

- Reading and passing only the state the composable needs. Split large composables into smaller ones so unrelated state is not read in the same scope.
- Exposing narrow, immutable UI-state values and event lambdas instead of broad mutable objects. Use stable/immutable data types where appropriate, and avoid creating unequal parameter objects on every recomposition.
- Using `derivedStateOf` for an expensive or frequently changing source whose derived result changes less often; use `distinctUntilChanged()` for Flow pipelines when the source emits equal values.
- Using `remember` for expensive calculations whose inputs have not changed.

For example, calculate a screen's UI state in the ViewModel, then pass only `uiState.items` to the list and only `uiState.isLoading` to the loading indicator. Do not use `remember` to cache a value that should actually update, and measure with recomposition/layout tracing before optimizing.

