Do not use `KEYS pattern` in production for this. `KEYS` blocks Redis while it scans the entire keyspace, which can cause latency spikes or outages.

The safer approach is:

1. Use `SCAN` to iterate incrementally over matching keys.
2. Delete in batches.
3. Prefer `UNLINK` over `DEL` when available, because `UNLINK` frees memory asynchronously and reduces blocking.

Typical flow:

- Run `SCAN cursor MATCH your:pattern:* COUNT 500` repeatedly until the cursor returns to `0`.
- Collect matched keys in small batches.
- Delete each batch with `UNLINK key1 key2 ...` or `DEL` if `UNLINK` is unavailable.

Why this is safer:

- `SCAN` is incremental and non-blocking relative to `KEYS`.
- Batch deletion avoids one huge command.
- `UNLINK` reduces pause time for large values.

Operational precautions:

- Test the pattern first on a small sample.
- Run during lower traffic if possible.
- Throttle the batch loop if Redis latency starts rising.
- Be aware that `SCAN` is not a snapshot: keys can appear or disappear while scanning.
- Make the pattern as specific as possible so you do not delete unrelated data.

Example shell pattern:

```bash
redis-cli --scan --pattern 'your:pattern:*' | xargs -L 100 redis-cli UNLINK
```

That is convenient, but for production you may still want tighter control over batch size and pacing.

A more controlled pseudocode approach:

```text
cursor = 0
repeat
  cursor, keys = SCAN cursor MATCH your:pattern:* COUNT 500
  if keys not empty
    UNLINK keys in chunks of 100-500
    optionally sleep briefly between chunks
until cursor == 0
```

Extra safety ideas:

- If this is a recurring cleanup task, maintain a Set or Sorted Set of keys you create so deletion can target known members directly instead of pattern-scanning the whole keyspace.
- If the keys belong to a tenant or feature, namespace them clearly up front to make cleanup safer.

In short: use `SCAN` plus batched `UNLINK`, not `KEYS`, and control the deletion rate so the Redis server stays responsive.

