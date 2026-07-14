Enable strict lazy-loading prevention outside production:

```php
use Illuminate\Database\Eloquent\Model;

public function boot(): void
{
    Model::preventLazyLoading(! app()->isProduction());
}
```

Now accidental relationship access without `with()` or `$with` throws `LazyLoadingViolationException` during local and test execution. Fix violations by eager-loading the relation at the query boundary, selecting required relationship keys, or using an aggregate such as `withCount()`. Keep the guard enabled in CI so an N+1 regression fails before deployment; production can disable the exception while still requiring intentional query design.

