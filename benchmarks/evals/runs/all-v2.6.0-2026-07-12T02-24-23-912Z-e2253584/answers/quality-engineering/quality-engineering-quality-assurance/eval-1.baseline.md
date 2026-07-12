The behavior for each role must be stated precisely before finalizing expected results. With the available scope, split the coverage into independent mobile cases:

1. `Mobile_SalesRep_AddToCart on Product Detail when eligible` — sign in as a Sales Rep, open an eligible product, verify the button’s required visibility/enabled state, tap it, and verify the Sales Rep outcome.
2. `Mobile_Customer_AddToCart on Product Detail when eligible` — repeat with a Customer and verify the Customer-specific outcome.
3. `Mobile_SalesRep_AddToCart when product is unavailable` — verify the Sales Rep behavior for an unavailable product.
4. `Mobile_Customer_AddToCart when product is unavailable` — verify the Customer behavior for an unavailable product.
5. `Web_AddToCart on Product Detail when feature is mobile-only` — verify the feature is absent or blocked on Web, according to the requirement.

Each test should have one condition, explicit role/platform preconditions, deterministic product data, steps, and one observable expected result. Clarify what differs between Sales Rep and Customer, whether unavailable products are in scope, and whether “only available on Mobile” means hidden or disabled elsewhere.
