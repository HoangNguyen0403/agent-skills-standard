Avoid loading a child relation once per parent. If the page needs one derived value per post, use an aggregate or correlated subquery in the parent query:

```php
$posts = Post::query()
    ->addSelect(['latest_comment_at' => Comment::select('created_at')
        ->whereColumn('comments.post_id', 'posts.id')
        ->latest()->limit(1)])
    ->withCount('comments')
    ->get();
```

Use `withCount()`, `withSum()`, `joinSub()`, or `whereExists()` according to whether you need an aggregate, a selected value, or only existence. Add indexes such as `comments(post_id, created_at)` and verify the SQL plan. The key is one intentional query (or a small fixed number), not a query inside a loop; use bindings for any raw expression.

