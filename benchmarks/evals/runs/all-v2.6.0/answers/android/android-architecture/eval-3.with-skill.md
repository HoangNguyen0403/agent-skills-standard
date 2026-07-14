Yes. A Composable should not call a repository directly. That couples presentation to data access, makes recomposition and lifecycle behavior harder to control, and makes the UI harder to test.

Use unidirectional data flow instead:

```text
Composable --events--> ViewModel --calls--> UseCase --> Repository
Composable <--UiState-- ViewModel
```

The ViewModel should invoke the use case in response to UI events and expose a `StateFlow<UiState>`. The Composable should collect it with `collectAsStateWithLifecycle()` and render the result. Keep repository implementations and data-source details in the data layer, and keep the domain layer free of Android dependencies.

