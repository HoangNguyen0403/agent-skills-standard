The most efficient general approach is cursor-based pagination, not large `skip()` pagination.

Why `skip()` becomes slow:

- MongoDB still has to walk past skipped rows
- performance degrades as page number gets larger
- results can become inconsistent if rows are inserted or deleted between requests

Prefer range-based pagination using a stable indexed field, commonly `_id` or `createdAt`.

Example with `_id`:

First page:

```javascript
db.posts.find({})
  .sort({ _id: 1 })
  .limit(20)
```

Next page using the last seen `_id`:

```javascript
db.posts.find({ _id: { $gt: lastSeenId } })
  .sort({ _id: 1 })
  .limit(20)
```

For descending order:

```javascript
db.posts.find({ _id: { $lt: lastSeenId } })
  .sort({ _id: -1 })
  .limit(20)
```

This works well because:

- the query can continue from an indexed position
- it avoids scanning and discarding many earlier rows
- it scales much better for deep pagination

Best practices:

- paginate on a field with a supporting index
- use a deterministic sort order
- include a tiebreaker if the main sort field is not unique

For example, if sorting by `createdAt`, multiple rows may share the same timestamp. In that case, use a compound sort such as:

```javascript
sort({ createdAt: -1, _id: -1 })
```

and continue with a matching cursor condition.

Example index:

```javascript
{ createdAt: -1, _id: -1 }
```

When `skip()` is acceptable:

- small admin pages
- shallow pagination
- low-volume datasets

But for user-facing feeds, logs, comments, or large collections, cursor pagination is usually the right choice.

A good API pattern is to return:

- the current page of results
- a `nextCursor` derived from the last item
- optionally a `hasMore` flag

That gives efficient, stable pagination with predictable performance as the dataset grows.

