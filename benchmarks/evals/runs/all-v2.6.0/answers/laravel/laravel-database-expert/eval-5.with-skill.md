Build the derived relation as a subquery and join it, or use an existence predicate when only membership matters:

```php
$latest = Comment::query()
    ->select('post_id', DB::raw('MAX(created_at) AS latest_comment_at'))
    ->groupBy('post_id');

$posts = Post::query()
    ->joinSub($latest, 'latest_comments', function ($join) {
        $join->on('posts.id', '=', 'latest_comments.post_id');
    })
    ->select('posts.*', 'latest_comments.latest_comment_at')
    ->get();
```

For filtering without selecting child rows:

```php
$posts = Post::whereExists(fn ($q) => $q->select(DB::raw(1))
    ->from('comments')->whereColumn('comments.post_id', 'posts.id')
    ->where('comments.approved', true))->get();
```

Use `selectRaw`/`whereRaw` with bindings, index join/filter columns, and inspect the query plan. Avoid string-concatenated SQL and correlated `whereIn` patterns that do unnecessary work.

