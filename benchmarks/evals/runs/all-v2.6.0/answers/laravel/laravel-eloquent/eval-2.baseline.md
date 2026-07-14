Declare the relationship on the model and eager load it in the query:

```php
// Post.php
public function comments(): HasMany
{
    return $this->hasMany(Comment::class);
}

$posts = Post::with(['comments' => fn ($query) => $query->latest()])->get();
```

Use `load()` for relationships after models have been retrieved and `loadMissing()` when composing code that should not repeat work. For nested relationships use dot notation or nested arrays. With selected columns, include the relationship's foreign/local keys. Keep default `$with` eager loads limited to relationships needed almost everywhere, since they add cost to every query.

