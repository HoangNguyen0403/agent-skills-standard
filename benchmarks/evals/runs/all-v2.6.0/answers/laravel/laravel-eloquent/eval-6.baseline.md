Call `Model::preventLazyLoading()` during application boot, usually outside production or with an environment-specific policy:

```php
public function boot(): void
{
    Model::preventLazyLoading(! app()->isProduction());
}
```

Then eager load relationships with `with`, `load`, or `loadMissing`, and use `withCount`/subqueries for aggregates. An unexpected relationship access will throw (or use a configured violation handler), exposing N+1 problems during development and tests. Do not simply disable the check to silence failures; fix the query or consciously handle an exceptional access path.

