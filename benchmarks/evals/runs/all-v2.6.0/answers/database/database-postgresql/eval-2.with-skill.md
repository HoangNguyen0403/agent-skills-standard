Prevent N+1 in TypeORM by shaping queries up front instead of lazily loading relations inside loops. The core rule is: fetch the data you know you need in one intentional query or a small fixed number of queries, not one extra query per row.

Good approaches:

1. Use `leftJoinAndSelect` or `innerJoinAndSelect` for relations you need immediately.

```ts
const users = await dataSource
  .getRepository(User)
  .createQueryBuilder('user')
  .leftJoinAndSelect('user.posts', 'post')
  .where('user.org_id = :orgId', { orgId })
  .orderBy('user.id', 'ASC')
  .getMany();
```

2. Use repository `find` with explicit `relations` for simple cases.

```ts
const users = await userRepository.find({
  where: { orgId },
  relations: { posts: true, profile: true },
});
```

3. If loading a large graph would explode row counts, split into a small number of targeted queries.
   - First fetch parent IDs with pagination.
   - Then fetch children with `IN (...)`.
   - Reassemble in memory.
   This is often better than one huge join and much better than N+1.

4. Paginate explicitly.
   - Do not join wide relation sets without deciding page size and ordering.
   - Use stable ordering and fetch only the current slice of parents.

5. Add indexes that match the query shape.
   - If you query posts by `user_id`, index `posts.user_id`.
   - If you filter by tenant and sort by creation time, prefer an index such as `(tenant_id, created_at)`.
   - Every index should have a clear read-path owner.

What to avoid:

- Lazy-loading relations in a loop:

```ts
for (const user of users) {
  const posts = await user.posts;
}
```

That pattern turns one request into 1 + N queries.

- Hiding relation loads deep in serializers or mappers.
- Blind eager loading everywhere, which can create different performance problems.

Practical rule of thumb:

- Small, predictable relation set: join it directly.
- Large or multi-collection graph: fetch in a few deliberate phases.
- Always inspect the real SQL and verify indexes support the filter, join, and sort paths.

In short: replace implicit per-row loading with explicit query design, then back it with the right PostgreSQL indexes.

