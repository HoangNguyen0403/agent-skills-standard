Group keys with Redis Sets rather than scanning the keyspace. When writing a cached entity, add its key to a tag set, for example `SADD tag:post:1 cache:post:1`. To invalidate the group, read the members, delete those keys, and delete the tag set. Avoid `KEYS`, which is O(N) and can block production Redis.

For multi-pod correctness, use Redis rather than `MemoryStorage`, and add jitter to TTLs. Domain events such as `PostUpdated` can perform invalidation asynchronously; make the operation idempotent and handle missing keys safely.

