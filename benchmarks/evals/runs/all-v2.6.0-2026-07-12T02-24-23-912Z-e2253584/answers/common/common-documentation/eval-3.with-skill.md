# Cleaning up ownerless TODO comments

Do not leave ambiguous TODOs in the codebase. For each one:

1. Determine whether it is still needed. Implement it now, remove it, or convert it into a tracked issue with a clear scope and acceptance criteria.
2. Assign an actual owner and link the tracking ticket.
3. Rewrite the comment to explain the intent and the risk, not just the missing mechanics.

Use the required format:

```text
TODO(username): Replace the temporary local cache with the shared cache before enabling multi-region workers. Ticket: AUTH-1234.
```

Search all source and documentation files, including generated or excluded paths as appropriate, then review each result rather than applying a blind replacement. Verify that every remaining TODO has a valid owner, ticket, and actionable description. Avoid converting dead code into TODOs; delete commented-out code and rely on version history instead. Add this check to code review or CI if ownerless TODOs are likely to recur.
