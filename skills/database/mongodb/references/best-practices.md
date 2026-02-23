# MongoDB Detailed Best Practices

## 1. Schema Design

### Embedding vs Referencing

- **Embed** (Denormalization):
  - **Use Case**: 1-to-Few relations, data accessed together (e.g., `User` + `Address`).
  - **Pros**: Single read/write operation. Atomicity (single document update).
  - **Cons**: Duplication updates, 16MB limit.
- **Reference** (Normalization):
  - **Use Case**: 1-to-Many/Infinity, data accessed separately (e.g., `User` + `Posts`).
  - **Pros**: Smaller documents, no duplication.
  - **Cons**: Requires application-level joins or `$lookup`.

### Patterns

- **Bucket Pattern**:
  - Instead of `Sensor` document with 1 array of 1M readings, execute one write per hour to create a `SensorHour` bucket with 60 readings.
- **Computed Pattern**:
  - Store computed values (e.g., `total_spent`) on the `User` document. Update it atomically with `$inc` on every purchase. Avoids expensive aggregations.

## 2. Indexing Strategy

- **ESR Rule (Equality, Sort, Range)**:
  - Create composite indexes in this order:
    1.  **Equality**: Fields you query exactly (`status: "active"`).
    2.  **Sort**: Fields you sort by (`date: -1`).
    3.  **Range**: Fields you filter by range (`price: { $gt: 10 }`).
- **Covered Queries**:
  - `db.users.find({ status: "A" }, { _id: 0, status: 1 }).explain()` -> `IXSCAN` (Index only, no `FETCH`).
  - Fastest possible query.

### Specialized Indexes

- **Text Index**: For search functionality. `db.coll.createIndex({ content: "text" })`.
- **TTL Index**: Auto-expire documents (Logs, Sessions) after `expireAfterSeconds`.
- **Partial Index**: Index only subset of documents. `createIndex({ email: 1 }, { partialFilterExpression: { email: { $exists: true } } })`. Saves storage.
- **Sparse Index**: Only indexes documents that _have_ the field. (Partial indexes are generally preferred in modern Mongo).

## 3. Operations & Performance

- **Explain Plans**:
  - Check `executionStats`.
  - **Ideal**: `totalKeysExamined` ≈ `nReturned`.
  - **Bad**: `totalDocsExamined` >> `nReturned` (means fetching docs just to filter them implies missing/bad index).
  - **Hint**: Use `.hint({ status: 1 })` to force a specific index if the optimizer gets it wrong.
- **Write Concerns**:
  - `w: 1` (Default): Acknowledged by Primary. Fast.
  - `w: "majority"`: Acknowledged by majority of Replicas. Safe against rollback.
- **Read Preferences**:
  - `primary` (Default): Strong consistency.
  - `secondaryPreferred`: Good for analytics/reporting to offload primary, but _eventual consistency_.
- **Aggregation Pipeline**:
  - **Filter Early**: Put `$match` and `$project` at the _very start_ of the pipeline.
  - **Constants**: Define stages as constants in code for maintainability.

## 4. Sharding Strategy

- **Shard Key Selection**:
  - **Cardinality**: Must be high (e.g., `user_id` is good, `status` is bad).
  - **Write Distribution**: Avoid Monotonic keys (Timestamp). Use **Hashed Sharding** (`{ _id: "hashed" }`) for even distribution.
  - **Query Isolation**: Ideal shard key allows `mongos` to target a single shard (Scatter-Gather is slow).

## 5. Mongoose Specifics (ODM)

- **Use `.lean()`**:
  - **Why?**: Mongoose hydrates raw JSON into heavy Mongoose Documents (with change tracking, getters/setters).
  - **Do**: `await Model.find().lean()`. Returns plain JS objects. ~5-10x faster for read-only.
- **Index Management**:
  - **Production**: Disable `autoIndex: false`. Build indexes in CI/CD or manually.
  - **Reason**: Index build can block deployment or cause downtime.
- **Population**:
  - **Avoid**: Deep/Nested `populate()`. It executes N+1 queries under the hood.
  - **Do**: Use `.aggregate()` with `$lookup` for complex joins.
