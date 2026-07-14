### User Story: Display Item Tax Breakdown

As a `{APP_NAME}` user,  
I want product cards to show the item tax breakdown,  
so that I can understand the Price Before Tax, Tax, and Price After Tax.

### Acceptance Criteria

- When `DisplayItemTaxBreakdown` is ON, each applicable product card displays:
  - Price Before Tax
  - Tax
  - Price After Tax
- The values shown reflect the product’s calculated tax breakdown.
- When `DisplayItemTaxBreakdown` is OFF, the tax breakdown is not displayed and existing product-card behavior remains unchanged.
- The Tender Contract page is out of scope and must not be changed as part of this feature.

Assumption: “applicable product card” means any product card where tax data is available.
