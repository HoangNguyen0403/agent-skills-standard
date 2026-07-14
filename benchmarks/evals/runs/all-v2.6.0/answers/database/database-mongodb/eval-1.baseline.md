For MongoDB, the main design choice is whether comments should be embedded inside each post document or stored in a separate collection.

Use embedding when:

- each post has only a small, bounded number of comments
- comments are almost always read together with the post
- you want simple reads with one document fetch

Example:

```json
{
  "_id": "post123",
  "authorId": "user42",
  "title": "My Post",
  "body": "Post content",
  "createdAt": "2026-07-11T00:00:00Z",
  "comments": [
    {
      "_id": "c1",
      "authorId": "user99",
      "text": "Nice post",
      "createdAt": "2026-07-11T00:05:00Z"
    }
  ]
}
```

This is simple, but it does not scale well if comments grow large in number because MongoDB documents have a size limit and frequent array updates can become expensive.

For a post with many comments, a better design is usually referencing with two collections:

`posts`

```json
{
  "_id": "post123",
  "authorId": "user42",
  "title": "My Post",
  "body": "Post content",
  "commentCount": 1240,
  "createdAt": "2026-07-11T00:00:00Z"
}
```

`comments`

```json
{
  "_id": "c1",
  "postId": "post123",
  "authorId": "user99",
  "text": "Nice post",
  "createdAt": "2026-07-11T00:05:00Z"
}
```

This approach is usually preferred for “one-to-many with unbounded growth” because:

- posts stay small and stable
- comments can scale independently
- pagination of comments is easier
- indexing is more flexible

Recommended indexes:

- `posts`: `{ authorId: 1, createdAt: -1 }` if listing a user’s posts
- `comments`: `{ postId: 1, createdAt: 1 }` or `{ postId: 1, createdAt: -1 }` for fetching comments by post in order

Practical guidance:

- keep the full post in `posts`
- store comments in a separate `comments` collection
- optionally keep summary fields on the post such as `commentCount`, `lastCommentAt`, or a small preview of recent comments

That gives you a balanced design: fast post reads, scalable comment storage, and efficient comment queries.

