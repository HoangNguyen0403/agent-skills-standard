# Laravel Database Expert Reference

## Advanced Query Builder

```php
// Complex subqueries and aggregates
$users = DB::table('users')
    ->select(['name', 'email'])
    ->selectSub(function ($query) {
        $query->from('posts')
            ->selectRaw('count(*)')
            ->whereColumn('user_id', 'users.id');
    }, 'posts_count')
    ->having('posts_count', '>', 10)
    ->get();
```

## Redis Caching Patterns

```php
// Cache aside pattern
$user = Cache::remember("user:{$id}", 3600, function () use ($id) {
    return User::findOrFail($id);
});

// Redis tagging for bulk invalidation
Cache::tags(['people', 'artists'])->put('John', $john, $seconds);
```

## Vertical Partitioning (Read/Write Connections)

```php
// config/database.php
'mysql' => [
    'read' => ['host' => '192.168.1.1'],
    'write' => ['host' => '192.168.1.2'],
],
```
