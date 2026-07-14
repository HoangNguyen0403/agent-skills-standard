Use cursor-based pagination, not deep `skip()`.

Why:

- `skip(n)` gets slower as `n` grows because MongoDB still has to walk past earlier results.
- Cursor pagination uses an indexed boundary from the last seen row, so each next page stays efficient even on large collections.

Recommended pattern

Choose a stable sort, usually:

- `createdAt`
- plus `_id` as a tiebreaker

Create an index that matches the query:

```js
db.posts.createIndex({ createdAt: -1, _id: -1 })
```

First page:

```js
db.posts
  .find({})
  .sort({ createdAt: -1, _id: -1 })
  .limit(20)
```

Suppose the last document on page 1 is:

```js
{ _id: ObjectId("..."), createdAt: ISODate("2026-07-11T03:00:00Z") }
```

Next page query:

```js
db.posts.find({
  $or: [
    { createdAt: { $lt: ISODate("2026-07-11T03:00:00Z") } },
    {
      createdAt: ISODate("2026-07-11T03:00:00Z"),
      _id: { $lt: ObjectId("...") }
    }
  ]
})
.sort({ createdAt: -1, _id: -1 })
.limit(20)
```

That gives you “items after the last seen item” without paying the cost of skipping thousands of rows.

If you paginate within a parent relationship, include the equality field first in the index. Example: comments for one post sorted newest first.

```js
db.comments.createIndex({ postId: 1, createdAt: -1, _id: -1 })
```

Then:

```js
db.comments.find({ postId })
  .sort({ createdAt: -1, _id: -1 })
  .limit(20)
```

And for the next page:

```js
db.comments.find({
  postId,
  $or: [
    { createdAt: { $lt: lastCreatedAt } },
    { createdAt: lastCreatedAt, _id: { $lt: lastId } }
  ]
})
.sort({ createdAt: -1, _id: -1 })
.limit(20)
```

Why this is good:

- It scales well for large datasets.
- It aligns with compound indexes.
- It avoids unstable page boundaries that happen when new rows arrive between page requests.

Practical advice:

- Always sort on a deterministic key set, not a single non-unique field alone.
- Return the last item’s cursor fields to the client.
- Project only fields needed for the page.
- Use `explain("executionStats")` to confirm the index is serving the query efficiently.

Use `skip()` only for small admin screens or shallow pagination where simplicity matters more than scalability. For user-facing large-result pagination, cursor-based pagination is the efficient MongoDB approach.

