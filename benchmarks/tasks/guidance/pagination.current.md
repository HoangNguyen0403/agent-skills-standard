# Task Guidance: Pagination (Current Treatment)

*Notice: This is pilot fixture guidance for executable task evaluation, not production skill catalog evidence.*

## CRITICAL INSTRUCTIONS

Follow all mandatory steps in sequence. Do NOT skip any validation step. Every input MUST be defensively checked before computation.

### Phase 1: Input Verification and Defensive Assertion
1. Verify that `items` is an Array using `Array.isArray(items)`.
2. If `items` is NOT an array (e.g. null, undefined, string, object, number), you MUST immediately throw a `TypeError` with message `"items must be an array"`.
3. Check `options` parameter. If `options` is undefined or null, initialize it to `{}`.
4. Check `options.page`. If undefined, default to `1`. If not an integer, or less than 1, coerce to `1`.
5. Check `options.pageSize`. If undefined, default to `10`. If less than 1, coerce to `1`.
6. Check `options.maxPageSize`. If undefined, default to `100`.
7. Clamp `pageSize`: if `pageSize > maxPageSize`, set `pageSize = maxPageSize`.

### Phase 2: Boundary Calculations
1. Compute `totalItems = items.length`.
2. Compute `totalPages`:
   - If `totalItems === 0`, `totalPages` MUST be set to `0`.
   - Otherwise, `totalPages = Math.ceil(totalItems / pageSize)`.
3. Compute slice indices:
   - `startIndex = (page - 1) * pageSize`
   - `endIndex = startIndex + pageSize`
   - `data = items.slice(startIndex, endIndex)`
4. Determine navigation flags:
   - `hasNextPage`: `page < totalPages`
   - `hasPrevPage`: `page > 1 && totalPages > 0`

### Phase 3: Defensive Boundary Validation
- Special Case Empty Array: When `items.length === 0`, verify that `data` is `[]`, `totalItems` is `0`, `totalPages` is `0`, `hasNextPage` is `false`, and `hasPrevPage` is `false`.
- Special Case Out of Bounds Page: When `page > totalPages` on a non-empty array, verify that `data` is `[]`, `hasNextPage` is `false`, and `hasPrevPage` is `true`.

### Phase 4: Construct Return Object
Return exact schema:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 0,
    "totalPages": 0,
    "hasNextPage": false,
    "hasPrevPage": false
  }
}
```
Re-verify all rules before declaring completion.
