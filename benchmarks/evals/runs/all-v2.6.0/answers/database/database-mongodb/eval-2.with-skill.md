Start with `explain()`, not guesswork. A query can still be slow with “an index present” if the index does not match the actual filter and sort pattern, if it scans too many keys, or if MongoDB still has to fetch too many documents.

Use this process:

1. Capture the exact query shape

- filter
- sort
- projection
- limit
- skip

Example:

```js
db.orders
  .find({ customerId: 123, status: "paid", createdAt: { $gte: someDate } })
  .sort({ createdAt: -1 })
  .project({ total: 1, createdAt: 1, status: 1 })
  .limit(50)
```

2. Run `explain("executionStats")`

```js
db.orders
  .find({ customerId: 123, status: "paid", createdAt: { $gte: someDate } })
  .sort({ createdAt: -1 })
  .limit(50)
  .explain("executionStats")
```

Focus on:

- `winningPlan`: which index was actually chosen
- `stage`: look for `COLLSCAN`, `IXSCAN`, `FETCH`, `SORT`
- `totalKeysExamined`
- `totalDocsExamined`
- `executionTimeMillis`

What the numbers mean:

- If `COLLSCAN` appears, MongoDB is ignoring indexes for this query shape.
- If `keysExamined` is high, the index is being scanned inefficiently.
- If `docsExamined` is much larger than returned rows, the filter is not selective enough or the index is not aligned to the predicate.
- If you see an in-memory `SORT`, your index likely does not support the requested sort order.

3. Check whether the index matches ESR order

For compound indexes, order fields by:

- equality filters first
- then sort fields
- then range fields

Example query:

```js
find({ customerId: 123, status: "paid", createdAt: { $gte: someDate } })
sort({ createdAt: -1 })
```

Good index:

```js
db.orders.createIndex({ customerId: 1, status: 1, createdAt: -1 })
```

Bad examples:

```js
db.orders.createIndex({ createdAt: -1, customerId: 1, status: 1 })
db.orders.createIndex({ status: 1 })
```

The first puts the range/sort field too early. The second is too weak for the full query shape.

4. Verify whether the query is covered

If MongoDB must fetch full documents after scanning the index, performance may still be poor. If the query only needs a few fields, project only those fields and see whether a covered query is possible.

Example:

```js
db.orders.createIndex({ customerId: 1, status: 1, createdAt: -1, total: 1 })
```

Then:

```js
db.orders
  .find(
    { customerId: 123, status: "paid" },
    { total: 1, createdAt: 1, _id: 0 }
  )
  .sort({ createdAt: -1 })
```

5. Look for common anti-patterns

- Deep `skip()` pagination
- Low-selectivity predicates
- Regex that cannot use the index efficiently
- Sorting on a field not aligned with the index
- Large documents causing expensive `FETCH`
- Too many overlapping indexes slowing writes and confusing plan choice
- Client-side filtering after fetching too much data

6. Compare actual workload, not isolated theory

Questions to ask:

- Is the slow query using the same filter every time?
- Is cardinality poor, for example `status = "active"` on most documents?
- Has data distribution changed since the index was created?
- Is the query slow only under production load because of memory, locking, or disk pressure?

7. Re-test after each index change

After creating or changing an index, rerun:

```js
...explain("executionStats")
```

You want:

- no `COLLSCAN`
- no blocking in-memory `SORT`
- `keysExamined` close to returned rows
- `docsExamined` close to returned rows

In short: diagnose slow indexed queries by checking whether the index actually matches the real filter/sort access pattern, then prove it with `explain()` using `winningPlan`, `keysExamined`, and `docsExamined` rather than assuming the existence of any index is enough.

