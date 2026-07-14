Define and validate a bounded query DTO, then let the service apply the ordering and pagination to the database query. Prefer cursor pagination for large or frequently changing datasets; offset pagination is simpler for small, stable lists.

```ts
class PageQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
```

With offset pagination, calculate `skip = (page - 1) * limit`, execute a bounded query, and return `{ data, meta: { page, limit, total, totalPages } }`. Always use a deterministic order (for example `createdAt DESC, id DESC`) and a stable filter. For cursor pagination, encode the last ordered key(s), query with a strict `<`/`>` predicate, fetch `limit + 1`, and return `nextCursor` only when another page exists. Do not load the whole table into memory, cap the limit, and consider whether an exact total count is worth its cost.

