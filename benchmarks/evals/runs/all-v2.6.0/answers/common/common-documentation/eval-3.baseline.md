Standardize TODOs to include an owner and ticket reference:

```ts
// TODO(owner: @alice, ticket: PROJ-123): Replace temporary fallback with API response.
```

Then:

1. Search all existing TODOs.
2. Assign each one to a responsible owner.
3. Create or link a ticket for every actionable TODO.
4. Remove obsolete TODOs.
5. Reject new TODOs that lack `owner` and `ticket`.
6. Track remaining TODOs through the ticket system rather than comments alone.

Assumption: your project uses an issue tracker with identifiers such as `PROJ-123`; replace that format with your tracker’s equivalent.
