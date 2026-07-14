TICK-1234’s AC, “User can view order history,” is not test-ready. It defines a goal but omits the Actor, authorization rules, data contract, platform behavior, and failure states.

Assumption for analysis: `Customer` means an authenticated customer viewing only their own orders on both Web and Mobile. This must be confirmed.

### Missing logic

- What qualifies as “order history”: all orders, only completed orders, or also pending, canceled, failed, refunded, and returned orders?
- Whether the newest or oldest order appears first.
- Pagination or infinite scroll behavior, including zero, one, and maximum-result boundaries.
- Required fields: order ID, date/time, items, status, total, currency, delivery address, payment method, and order-detail navigation.
- Behavior when an order has missing, null, deleted, or partially migrated data.
- Whether users can search, filter, sort, or reopen order details. These should be explicitly in scope or deferred.
- Date boundary rules: today, year boundaries, timezone conversion, and future-dated orders.
- Currency and amount formatting, including VN/MY/SG market rules.
- Loading, empty-history, timeout, server error, and retry behavior.
- Offline behavior on Mobile and Web.
- Behavior for suspended, deactivated, deleted, or logged-out users.
- Refresh, back navigation, duplicate requests, and stale cached data.
- Performance expectations for large histories and accessibility requirements.

### Actor and permission matrix

| Actor | Expected access | Missing decision |
|---|---|---|
| `Customer` | View own order history | Confirm authenticated-only access and ownership rule |
| Guest | No access, or limited lookup | Define behavior explicitly |
| `Customer` viewing another customer’s order ID | Must be denied | Define API/UI response and IDOR protection |
| `Sales Rep` | No access, assigned-customer access, or broader access | Role and tenant restrictions are undefined |
| `Admin`/support | Possibly broader access | Define audit logging, masking, and authorization scope |
| Suspended/deactivated customer | Denied, read-only, or allowed | State behavior is undefined |

Authorization must be enforced server-side for every list and detail endpoint; hiding UI controls is insufficient.

### Platform, toggle, and market gaps

- Each AC must be tagged `[WEB]`, `[MOBILE]`, or `[BOTH]`. Web and Mobile parity is currently undefined.
- If feature-gated, identify the exact `Toggle: <FlagName>` and specify both `ON` and `OFF` behavior.
- If behavior differs by market, add `[Market: VN]`, `[Market: MY]`, and `[Market: SG]` ACs as applicable.
- Define locale, translation, date format, timezone, decimal separator, and currency behavior as separate ACs.

### Key edge-case truth table

| Authenticated | Own orders exist | Network/API | Expected result |
|---|---:|---|---|
| No | Any | Any | Access denied or login prompt; exact behavior required |
| Yes | No | Healthy | Empty state with defined copy and action |
| Yes | Yes | Healthy | Authorized history rendered with defined ordering and fields |
| Yes | Yes | Timeout/error | Defined error state and retry behavior |
| Yes | Yes | Offline | Cached history, offline message, or unavailable state must be specified |
| Yes | Another user’s orders | Healthy | Deny access without leaking order existence |
| Suspended/deactivated | Any | Healthy | Explicitly defined access policy |
| Toggle `ON` | Any | Any | Feature enabled with specified behavior |
| Toggle `OFF` | Any | Any | Feature hidden, disabled, or fallback behavior specified |

### Recommended atomic AC coverage

Split the requirement into separate Given/When/Then blocks for:

1. Authentication and access control.
2. Customer ownership filtering.
3. History list rendering.
4. Order status coverage.
5. Ordering and pagination.
6. Empty state.
7. Loading and API failure states.
8. Offline behavior.
9. Order-detail navigation.
10. Web/Mobile behavior.
11. Toggle `ON` and `OFF`.
12. Market and locale formatting.
13. Unauthorized direct API/deep-link access.
14. Null, malformed, and incomplete order data.

Until these decisions are recorded in TICK-1234—or explicitly placed in `## Out of Scope` or `## Deferred` with linked Jira tickets—the AC should be treated as a P0 requirements gap rather than converted directly into test cases.
