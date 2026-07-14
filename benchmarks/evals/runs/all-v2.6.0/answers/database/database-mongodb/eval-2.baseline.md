If a MongoDB query is slow even with an index, the next step is to verify whether MongoDB is actually using the index effectively and whether the query shape matches the index.

Start with `explain()`:

```javascript
db.collection.find({ status: "open", userId: 42 }).sort({ createdAt: -1 }).explain("executionStats")
```

Look at:

- `winningPlan`: shows whether MongoDB chose an index scan or collection scan
- `totalDocsExamined`: how many documents were read
- `totalKeysExamined`: how many index entries were scanned
- `executionTimeMillis`: rough execution time

Key diagnosis rules:

1. If you see `COLLSCAN`, the query is not using a useful index.
2. If `totalKeysExamined` and `totalDocsExamined` are both very high, the index exists but is not selective enough.
3. If many keys are scanned before returning a few rows, the index order may not match the filter or sort pattern.

Common reasons an indexed query is still slow:

- wrong index order in a compound index
- sorting on a field not supported by the index
- low-selectivity fields such as booleans or common statuses
- querying too many documents and then filtering after the scan
- large document fetch cost because the index is not covering
- `$regex`, `$ne`, `$nin`, or range conditions reducing index efficiency
- index works for the filter but not the sort

Things to check:

Compound index order:

- equality fields usually come first
- then range fields
- sort fields should be aligned with the index when possible

For example, for:

```javascript
find({ userId: 42, status: "open" }).sort({ createdAt: -1 })
```

an index like:

```javascript
{ userId: 1, status: 1, createdAt: -1 }
```

is often better than separate single-field indexes.

Covered query opportunity:

If the query only needs fields present in the index, MongoDB may avoid fetching full documents. That can reduce latency significantly.

Example:

```javascript
db.collection.find(
  { userId: 42 },
  { _id: 0, userId: 1, createdAt: 1 }
)
```

with a matching index can be much faster than returning large documents.

Also check data shape and workload:

- are documents very large?
- are you returning too many results at once?
- is the query running under high write load or resource pressure?
- is the working set larger than memory?

Useful practical workflow:

1. Run `explain("executionStats")`.
2. Confirm the chosen index.
3. Compare docs examined vs rows returned.
4. Make sure filter and sort match a compound index.
5. Reduce returned fields if possible.
6. Re-test after index changes.

In short: an index existing is not enough. The query is fast only when the index matches the actual filter, sort, and projection pattern well.

