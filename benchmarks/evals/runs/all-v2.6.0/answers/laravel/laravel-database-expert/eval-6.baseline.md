Avoid N+1 by loading relationships in bulk and by selecting only the required columns:

```php
$posts = Post::with(['author:id,name', 'comments' => fn ($q) => $q->latest()->limit(5)])
    ->withCount('comments')
    ->get(['id', 'author_id', 'title']);
```

For derived values, use `withCount`, `withSum`, `withExists`, `selectSub`, or `addSelect` with a correlated subquery instead of querying in a loop. Ensure foreign keys needed for relationships are selected. Inspect query counts with `DB::listen`, Telescope, or tests, and enable `Model::preventLazyLoading()` in non-production/testing to expose regressions. A subquery is not automatically faster; compare execution plans and indexes.

