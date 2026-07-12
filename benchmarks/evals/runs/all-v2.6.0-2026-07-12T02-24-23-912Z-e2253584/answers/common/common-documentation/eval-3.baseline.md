Replace vague TODOs with actionable, traceable comments. Each TODO should state the intended outcome, identify an owner, and link to the ticket or design context. Include enough surrounding context to explain why the work matters, but do not use TODOs as a substitute for documenting a known limitation or filing work.

For example, change:

```ts
// TODO: fix this later
return fallbackValue;
```

to:

```ts
// TODO(auth-team, PROJ-1842): Replace the temporary fallback with the
// provider-backed lookup once the provider timeout contract is finalized.
// Current behavior is intentional for this release: it preserves availability
// but may return stale data.
return fallbackValue;
```

A useful TODO normally contains:

- Owner: a team or stable handle responsible for follow-up.
- Ticket: a resolvable issue, task, or design reference.
- Action: the concrete change required.
- Context or constraint: why it is deferred and what behavior exists meanwhile.

Avoid assigning a personal owner without a handoff plan, inventing ticket IDs, or leaving comments that merely restate the code. For scattered existing TODOs, inventory them, create or associate tracking tickets, assign owners based on the owning component, and update each comment consistently. Then add a review or lint check that rejects new unowned TODOs (or requires an approved exception), and periodically remove comments when the linked work is completed.
