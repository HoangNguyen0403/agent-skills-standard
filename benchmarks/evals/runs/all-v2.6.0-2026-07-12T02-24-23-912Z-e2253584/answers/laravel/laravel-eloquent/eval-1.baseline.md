Find the relationship access that runs inside a loop and eager load it before iteration:

```php
$posts = Post::with('author')->latest()->get();

foreach ($posts as $post) {
    echo $post->author->name;
}
```

Use nested eager loading (`with('author.team')`), constrained eager loading, `withCount`, or explicit joins/subqueries for aggregates. Select the relationship key as well as displayed columns. Use query logging or a query-count assertion to verify that the fix changes N+1 queries to a bounded number, and enable `preventLazyLoading` in development/tests to catch future regressions.

