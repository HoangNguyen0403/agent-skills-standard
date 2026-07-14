Context notifies all consumers when its value changes, so memoizing consumer components alone does not stop the update. Profile first, then reduce subscription scope:

- Split unrelated values into separate contexts.
- Separate frequently changing state from stable actions.
- Place providers closer to the consumers that need them.
- Use a selector-based external store for many consumers needing different slices.

Memoize the context value and callbacks when that prevents identity churn, but it is not a general fix because consumers still update when the context value changes. Keep server state in a query/cache layer rather than a broad UI context when that is the source of updates.
