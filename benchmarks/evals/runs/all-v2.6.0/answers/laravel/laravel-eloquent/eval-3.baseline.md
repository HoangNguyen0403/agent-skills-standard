Define a method beginning with `scope` and accept the query builder as its first argument:

```php
public function scopePublished(Builder $query): void
{
    $query->whereNotNull('published_at')->where('status', 'published');
}

$posts = Post::published()->latest('published_at')->get();
```

For a scope with parameters, add typed parameters after the builder, such as `scopeForAuthor(Builder $query, int $authorId)`. Keep scopes composable and unsurprising; do not hide authorization, writes, or expensive unrelated joins in a commonly named scope. Test the generated behavior and add indexes for frequent scope predicates.

