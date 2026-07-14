Assumption: each TODO represents a real follow-up rather than intentionally deferred work.

1. Inventory every TODO and assign an owner.
2. Create or link a ticket for each actionable item.
3. Rewrite comments using the required format:

```ts
// TODO(alice): Explain why retry jitter is required to prevent the thundering herd.
// Ticket: PROJ-123
```

4. Make comments explain `why`, not mechanics or obvious code behavior.
5. Convert public API comments to JSDoc, including `Args`, `Returns`, and a `Usage` example where applicable.
6. Delete obsolete or commented-out code; recover it through Git history if needed.
7. Remove TODOs that are completed, invalid, or no longer needed.
8. Add a review/check that rejects new orphan TODOs without an owner and ticket reference. Documentation should ship with the related feature.
