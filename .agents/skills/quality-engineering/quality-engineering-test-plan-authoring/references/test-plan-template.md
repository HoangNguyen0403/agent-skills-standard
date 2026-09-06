# Test Plan Template

```md
# Test Plan: [slug]

## Lanes
web | ios | android | api

## Scenarios

### Scenario 1: [name]
- @AC-1
- priority: high
- lane: web
- Steps:
  1. Navigate to /checkout
  2. Fill shipping form with valid data
  3. Click submit
- Expected: order confirmation page shows order id

## Selector Gaps
- checkout screen: submit button has no data-testid (uses text "Place Order")

## Data & Reset
- Requires a seeded cart with 1 item; reset via `POST /test/reset-cart` between scenarios
```
