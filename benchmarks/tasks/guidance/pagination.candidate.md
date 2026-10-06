# Task Guidance: Pagination (Candidate Modernized Treatment)

*Notice: This is pilot fixture guidance for executable task evaluation, not production skill catalog evidence.*

## Target Contract

Export `paginate(items, options)` in `src/paginate.js` with deterministic boundary behavior:

```typescript
interface PaginationOptions {
  page?: number;        // default: 1, min: 1 (normalized)
  pageSize?: number;    // default: 10, min: 1, max: maxPageSize
  maxPageSize?: number; // default: 100
}

interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
```

## Invariants and Boundaries

| Case | `totalItems` | `totalPages` | `data` | `hasNextPage` | `hasPrevPage` |
|---|---|---|---|---|---|
| `items = []` | `0` | `0` | `[]` | `false` | `false` |
| `page = 1, totalPages = 1` | `N > 0` | `1` | `items[0..N-1]` | `false` | `false` |
| `page > totalPages > 0` | `N > 0` | `M` | `[]` | `false` | `true` |
| `page = 1 < totalPages` | `N > pageSize` | `M > 1` | `items[0..pageSize-1]` | `true` | `false` |

## Validation & Normalization
1. `!Array.isArray(items)`: throw `new TypeError("items must be an array")`.
2. `page`: coerce non-positive or non-finite integer values to `1`.
3. `pageSize`: clamp to range `[1, maxPageSize]`.
