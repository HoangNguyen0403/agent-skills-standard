Prevent N+1 by shaping the relationship query before iterating:

```php
$posts = Post::query()->with('author')->latest()->get();
foreach ($posts as $post) {
    echo $post->author->name;
}
```

For counts, use `withCount('comments')` rather than loading comments per row. In development, enable `Model::preventLazyLoading(! app()->isProduction())` in `AppServiceProvider::boot()` so accidental lazy loads throw `LazyLoadingViolationException`. Select only needed columns while retaining relationship keys, and inspect the query log to verify the query count. Do not blindly eager-load every relation; load the graph the response actually needs.

