Put the order-total rules in a use case or a domain service, ideally as a pure, easily testable function. The use case can combine the order lines with discount, tax, shipping, and currency rules and return a total.

The ViewModel should request that calculation and expose the result as UI state; it should not own the business rules. The Repository should retrieve or persist orders and related data. It may provide server-calculated totals when the server is authoritative, but it should not become the general home for UI-independent pricing rules.

Keep money in an appropriate representation such as integer minor units or a decimal type rather than `Double`, and unit-test the edge cases (discounts, tax, rounding, empty orders, and currency behavior). Avoid putting the calculation in a Composable.

