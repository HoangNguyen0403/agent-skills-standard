Design it from the read path first:

- If posts are read with only a small, bounded preview of comments, keep `posts` and `comments` in separate collections and optionally embed a tiny cached summary on the post document.
- Do not embed all comments directly inside the post if each post can accumulate many comments over time. That creates an unbounded array, larger documents, slower writes, and eventually document-size pressure.

A practical schema is:

```js
// posts
{
  _id: ObjectId,
  authorId: ObjectId,
  title: String,
  body: String,
  commentCount: Number,
  latestComments: [
    {
      _id: ObjectId,
      authorId: ObjectId,
      bodyPreview: String,
      createdAt: Date
    }
  ], // bounded preview only
  createdAt: Date,
  updatedAt: Date
}

// comments
{
  _id: ObjectId,
  postId: ObjectId,
  authorId: ObjectId,
  body: String,
  createdAt: Date,
  updatedAt: Date
}
```

Why this shape works:

- Comments have unbounded growth, so they should have an independent lifecycle.
- Posts and comments can scale separately.
- You can fetch the post first, then query comments by `postId`.
- A bounded `latestComments` preview improves common reads without storing the full comment history inline.

Indexes should match real queries:

```js
db.comments.createIndex({ postId: 1, createdAt: -1 })
db.posts.createIndex({ authorId: 1, createdAt: -1 })
```

The `comments` index supports the common access pattern:

- equality: `postId`
- sort: `createdAt`

That follows the equality -> sort -> range principle for compound indexes.

Typical reads:

```js
db.posts.findOne({ _id: postId })

db.comments
  .find({ postId })
  .sort({ createdAt: -1 })
  .limit(20)
```

If you need threaded replies, avoid deep recursive nesting in a single document. Instead store:

```js
{
  _id,
  postId,
  parentCommentId: ObjectId | null,
  ...
}
```

Then index for that access pattern too:

```js
db.comments.createIndex({ postId: 1, parentCommentId: 1, createdAt: 1 })
```

In short: embed only bounded comment summaries that are read with the post, but store the actual comments in a separate collection because “many comments” implies unbounded growth and a separate lifecycle.

