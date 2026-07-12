User story:

As a {APP_NAME} user,
I want to see the tax breakdown on product cards when DisplayItemTaxBreakdown is enabled,
so that I can understand the price before tax, tax amount, and price after tax.

Acceptance criteria:

1. Given DisplayItemTaxBreakdown is ON and a product card has tax data, the card shows Price Before Tax, Tax, and Price After Tax.
2. Given DisplayItemTaxBreakdown is OFF, the product card does not show those tax-breakdown fields.
3. The three values use the product’s currency and the agreed rounding and formatting rules.
4. The values are shown consistently for every in-scope product-card state, including a product with zero tax if that is a valid business state.
5. Missing or invalid tax data follows an agreed fallback and does not display misleading values.
6. The change applies to product cards only. The Tender Contract page is explicitly out of scope.

Clarify the default toggle state, user/market/platform scope, tax calculation source, rounding, localization, and behavior while tax data is loading or unavailable.
