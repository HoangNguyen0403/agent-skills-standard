# MongoDB Anti-Patterns ("Don't Do This")

## 1. Schema Anti-Patterns

- **Unbounded Arrays**:
  - **Don't**: `$push` comments into a Post document without limit.
  - **Why?**: Document grows >16MB. Updates confuse the storage engine (moves document on disk).
  - **Do**: Use "Bucketing" or Reference for high-cardinality arrays.
- **Massive Documents**:
  - **Don't**: Store binary images/videos in MongoDB BSON.
  - **Why?**: Bloats working set (RAM).
  - **Do**: Store S3 URL in Mongo. Use GridFS only if essential.

## 2. Query Anti-Patterns

- **Regex without Anchor**:
  - **Don't**: `find({ name: /john/ })` (Contains).
  - **Why?**: Cannot use Index effectively (Full Scan).
  - **Do**: `find({ name: /^john/ })` (Starts With) uses Index. Or use `$text` search / Atlas Search.
- **Redundant Indexes**:
  - **Don't**: Create index `{ a: 1 }` if `{ a: 1, b: 1 }` exists.
  - **Why?**: The compound index `{ a: 1, b: 1 }` can already support queries on `a`. Extra index wastes RAM and slows writes.
- **Negation Operators**:
  - **Don't**: `$ne` (Not Equal) or `$nin`.
  - **Why?**: Usually require scanning all index keys (inefficient).
- **Deep Pagination**:
  - **Don't**: `skip(50000).limit(10)`.
  - **Why?**: Engine must iterate 50,000 docs.
  - **Do**: `find({ _id: { $gt: last_seen_id } }).limit(10)`.

## 3. Sharding Anti-Patterns

- **Monotonic Shard Keys**:
  - **Don't**: Shard by `created_at` or `_id` (ObjectId) for write-heavy collections.
  - **Why?**: All new writes go to the "last" chunk (Chunk Migration cannot keep up).
  - **Do**: Use Hashed Sharding.
- **Jumbo Chunks**:
  - **Don't**: Choose a shard key with low cardinality (e.g., `country` if 90% users are in 'US').
  - **Why?**: 'US' chunk will grow beyond limit (64MB) and cannot be split.

## 3. Code/Driver Anti-Patterns

- **Opening connections per request**:
  - **Don't**: `MongoClient.connect()` inside the API handler.
  - **Why?**: Handshake is slow.
  - **Do**: Singleton connection / Connection Pool.
