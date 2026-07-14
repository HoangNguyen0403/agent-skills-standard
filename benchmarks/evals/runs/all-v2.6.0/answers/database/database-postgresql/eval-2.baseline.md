To prevent N+1 query problems with TypeORM, the main idea is to load related data intentionally instead of letting the ORM lazily issue one extra query per row.

N+1 usually happens like this:

1. You query a list of parent rows, such as users.
2. Then for each user, you access a relation like `user.posts`.
3. TypeORM runs an extra query for each user.

That becomes:

- 1 query for the users
- N more queries for each user’s related rows

The most effective fixes are eager joins, explicit relation loading, batching, and query-shape review.

Use joined fetching when you know you need related data:

```ts
const users = await dataSource
  .getRepository(User)
  .createQueryBuilder("user")
  .leftJoinAndSelect("user.posts", "post")
  .getMany();
```

This turns many small round trips into one query. It is often the simplest fix for read paths like list pages, dashboards, and APIs that always need the relation.

Use `relations` for repository-based loading:

```ts
const users = await userRepository.find({
  relations: {
    posts: true,
  },
});
```

This is convenient, though query builders give you more control when the query gets complex.

Avoid lazy relations in hot paths.

If your entity uses lazy-loaded relations such as:

```ts
posts: Promise<Post[]>;
```

then code like this can trigger N+1:

```ts
for (const user of users) {
  const posts = await user.posts;
}
```

That pattern is easy to write and easy to miss in reviews. In performance-sensitive endpoints, prefer explicit loading up front.

Select only what you need.

Sometimes developers over-fix N+1 by joining too much data. That can create huge result sets and duplicated rows. Instead, shape the query for the actual response:

```ts
const users = await dataSource
  .getRepository(User)
  .createQueryBuilder("user")
  .leftJoin("user.posts", "post")
  .select([
    "user.id",
    "user.name",
    "post.id",
    "post.title",
  ])
  .getMany();
```

Batch when a join is not the right tool.

For some access patterns, especially when multiple independent relations are needed, it can be better to:

1. fetch parent IDs
2. fetch children with `WHERE ... IN (...)`
3. map them in memory

Example strategy:

```ts
const users = await userRepository.find();
const userIds = users.map((u) => u.id);

const posts = await postRepository
  .createQueryBuilder("post")
  .where("post.userId IN (:...userIds)", { userIds })
  .getMany();
```

This still avoids N+1 while preventing an oversized multi-join query.

Use pagination carefully.

Joining one-to-many relations on a paginated endpoint can produce duplicate parent rows and confusing limits. A common pattern is:

1. page the parent rows first
2. load related rows in one follow-up batched query

This keeps pagination correct and still avoids one query per row.

Inspect generated SQL.

TypeORM can hide expensive behavior unless you look at the actual queries. Enable query logging in development and watch for:

- repeated `SELECT` statements differing only by one ID
- relation loads inside loops
- unexpected lazy-load behavior

Cache only when it matches the access pattern.

TypeORM supports query caching, but caching is not the primary fix for N+1. First fix the query shape. Cache helps when the same expensive query repeats often, not when the application is issuing a bad query pattern.

Practical rules of thumb:

- never access relations inside a loop unless you know they were preloaded
- prefer `leftJoinAndSelect` or `relations` for predictable read paths
- use batch loading for paginated one-to-many data
- review SQL logs for repeated relation queries
- benchmark before and after changes

In short: prevent N+1 in TypeORM by loading related data explicitly, avoiding lazy relation access in loops, and choosing between joins and batched secondary queries based on the endpoint’s shape.

