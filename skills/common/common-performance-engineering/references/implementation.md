# Implementation Examples

## Memoization (TypeScript)

```typescript
// Memoization example — avoid recomputing expensive transforms
const cache = new Map<string, Result>();
function getExpensiveResult(key: string): Result {
  if (!cache.has(key)) {
    cache.set(key, computeExpensive(key));
  }
  return cache.get(key)!;
}
```

## Batching (Python)

```python
# Batching example — avoid N+1 API calls
# Bad: [fetch(f"/users/{id}") for id in ids]
# Good:
results = fetch("/users", params={"ids": ",".join(ids)})
```
