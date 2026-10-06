# Task Guidance: Pagination (Minimal Treatment)

*Notice: This is pilot fixture guidance for executable task evaluation, not production skill catalog evidence.*

## Specification

Module `src/paginate.js` must export function `paginate(items, options)`:

- `items`: Required Array. Throw `TypeError` if not an Array.
- `options.page`: 1-based page number. Default `1`. Normalize non-positive or non-integer values to `1`.
- `options.pageSize`: Items per page. Default `10`. Minimum `1`. Cap at `maxPageSize`.
- `options.maxPageSize`: Maximum allowed pageSize. Default `100`.

## Return Value

```javascript
{
  data: Array,
  pagination: {
    page: number,
    pageSize: number,
    totalItems: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPrevPage: boolean
  }
}
```

## Boundary Invariants

- Empty array `[]`: `totalItems: 0`, `totalPages: 0`, `data: []`, `hasNextPage: false`, `hasPrevPage: false`.
- Page beyond `totalPages`: `data: []`, `hasNextPage: false`, `hasPrevPage: true` (if `totalItems > 0`).
- Exact multiples: `totalPages = Math.ceil(totalItems / pageSize)`.
- `hasNextPage`: `page < totalPages`.
- `hasPrevPage`: `page > 1 && totalPages > 0`.
