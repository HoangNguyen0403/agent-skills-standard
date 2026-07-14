Put the order-total business logic in a domain-layer `UseCase`, for example `CalculateOrderTotalUseCase`.

- **UseCase/domain:** Pure Kotlin business rules such as item totals, discounts, tax, and rounding. It must not depend on Android or `Context`.
- **Repository:** Retrieves or persists data and maps DTOs/data models to domain models; it should not own the order-calculation rules.
- **ViewModel:** Calls the use case in response to UI events and exposes the result through a `StateFlow<UiState>`.
- **Composable:** Sends events upward and renders state downward; it should not calculate totals or access the repository.

This keeps the rule independently testable and preserves unidirectional data flow.

