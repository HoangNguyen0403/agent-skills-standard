Do not use `KEYS <pattern>` followed by mass `DEL`. That approach is blocking and can hurt Redis latency badly.

The safe pattern is:

1. Iterate with `SCAN`
2. Delete in batches
3. Prefer `UNLINK` over `DEL` so memory reclamation happens in the background

Why:

- `SCAN` is cursor-based and does not block Redis like `KEYS` does.
- `UNLINK` is better for large values or large delete waves because it avoids synchronous freeing cost on the main thread.

Example with `redis-cli` shell loop:

```bash
cursor=0
pattern='app:tenant:t_42:cache:*'

while :; do
  reply=$(redis-cli SCAN "$cursor" MATCH "$pattern" COUNT 500)
  cursor=$(printf '%s\n' "$reply" | sed -n '1p')
  keys=$(printf '%s\n' "$reply" | sed -n '2,$p')

  if [ -n "$keys" ]; then
    printf '%s\n' "$keys" | xargs redis-cli UNLINK
  fi

  [ "$cursor" = "0" ] && break
done
```

Application-level pseudocode:

```ts
let cursor = "0";
do {
  const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 500);
  cursor = nextCursor;

  if (keys.length > 0) {
    const pipeline = redis.pipeline();
    for (const key of keys) pipeline.unlink(key);
    await pipeline.exec();
  }
} while (cursor !== "0");
```

Recommended precautions:

- Use a narrow prefix pattern, not a loose wildcard.
  - Good: `app:tenant:t_42:session:*`
  - Risky: `*session*`

- Delete in batches.
  - 100 to 1000 keys per scan batch is usually a reasonable starting point, then tune from there.

- Run this as a background or maintenance operation, not inside a user-facing hot path.

- If keys belong to one tenant or one feature, encode that in the key namespace up front so cleanup stays targeted.

- Monitor latency and slowlog during the deletion wave if you are doing this in production.

If this is a recurring cleanup need, consider preventing the problem at the source:

- Put TTLs on ephemeral keys so they age out automatically.
- Add explicit index keys or ownership prefixes if group deletion is a common operation.
- Review whether any deleted values are too large and should be split or stored as hashes.

Bottom line: for deleting 10,000 matching Redis keys safely, use `SCAN` plus batched `UNLINK`, never `KEYS`, and keep the pattern tightly scoped.

