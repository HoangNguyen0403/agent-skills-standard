---
name: database-transactions
description: Define transaction boundaries, locking, and consistency guarantees for multi-step writes. Use when designing atomic operations, retries, idempotency, or concurrent write behavior.
metadata:
  triggers:
    keywords:
    - transaction
    - consistency
    - idempotency
    - lock
    - concurrent write
---
# Database Transactions

## **Priority: P0 (FOUNDATIONAL)**

One business action should have one clear consistency strategy.

## Rules

- Define the unit of work before choosing transaction scope.
- Keep transaction bodies short and purposeful.
- Record isolation, lock, retry, and idempotency expectations for contested writes.
- Split eventually consistent workflows from truly atomic ones.

## Verify

- [ ] Transaction boundary matches one business action.
- [ ] Isolation or locking tradeoff is explicit.
- [ ] Retry and idempotency behavior is defined for duplicate or concurrent requests.
- [ ] External side effects are not hidden inside a DB transaction without compensation.

## Anti-Patterns

- **No giant transaction scripts**: long units increase contention and failure blast radius.
- **No retry without idempotency**: duplicate writes become correctness bugs.
- **No mixed atomicity story**: define what is immediate vs eventual.

## References

- [Framework Map](../references/framework-map.md)
