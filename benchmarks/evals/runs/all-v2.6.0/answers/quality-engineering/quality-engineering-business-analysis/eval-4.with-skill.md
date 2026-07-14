# User Story: {APP_NAME} Tax Breakdown on Product Cards

As a `{APP_NAME}` user, I want to see the product tax breakdown on product cards, so that I understand the price before tax, tax amount, and final price.

## Assumptions

- The behavior applies to both Web and Mobile.
- No market-specific behavior is required.
- Existing locale, currency, and translation formatting applies.

## Actor/Permission Matrix

| Actor | Permission |
|---|---|
| `{APP_NAME}` user | View product cards and tax breakdown values |

## Acceptance Criteria

### AC1 — Display Price After Tax

**[BOTH]**  
**Given** `Toggle: DisplayItemTaxBreakdown = ON`  
**When** the user views a product card  
**Then** `Price After Tax` is displayed.

### AC2 — Display Price Before Tax

**[BOTH]**  
**Given** `Toggle: DisplayItemTaxBreakdown = ON`  
**When** the user views a product card  
**Then** `Price Before Tax` is displayed.

### AC3 — Display Tax

**[BOTH]**  
**Given** `Toggle: DisplayItemTaxBreakdown = ON`  
**When** the user views a product card  
**Then** `Tax` is displayed.

### AC4 — Hide Price After Tax

**[BOTH]**  
**Given** `Toggle: DisplayItemTaxBreakdown = OFF`  
**When** the user views a product card  
**Then** `Price After Tax` is not displayed.

### AC5 — Hide Price Before Tax

**[BOTH]**  
**Given** `Toggle: DisplayItemTaxBreakdown = OFF`  
**When** the user views a product card  
**Then** `Price Before Tax` is not displayed.

### AC6 — Hide Tax

**[BOTH]**  
**Given** `Toggle: DisplayItemTaxBreakdown = OFF`  
**When** the user views a product card  
**Then** `Tax` is not displayed.

## Truth Table

| `DisplayItemTaxBreakdown` | Surface | Expected result |
|---|---|---|
| ON | Product card | Display `Price After Tax`, `Price Before Tax`, and `Tax` |
| OFF | Product card | Hide all three tax breakdown items |
| ON or OFF | Tender Contract page | No requirement; page is out of scope |

## In Scope

- Tax breakdown visibility on product cards.
- `DisplayItemTaxBreakdown` ON/OFF behavior.
- Web and Mobile product-card parity.

## Out of Scope

- Tender Contract page.
- Changes to tax calculation.
- Changes to currency or locale formatting.

## Deferred

None.
