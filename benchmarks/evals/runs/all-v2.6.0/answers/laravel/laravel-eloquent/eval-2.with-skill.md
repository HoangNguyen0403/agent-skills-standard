Declare the relationship on the model and load it explicitly with `with()` at the query boundary:

```php
class Post extends Model
{
    protected $fillable = ['title', 'body', 'user_id'];

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}

$posts = Post::with(['author', 'comments'])->latest()->get();
```

Use `$with` only for relations required by nearly every read. For large results, constrain selected columns while preserving foreign keys and use pagination or `chunk()`/`cursor()`. Enable strict lazy-loading prevention in non-production so a missing eager load is caught during development.

