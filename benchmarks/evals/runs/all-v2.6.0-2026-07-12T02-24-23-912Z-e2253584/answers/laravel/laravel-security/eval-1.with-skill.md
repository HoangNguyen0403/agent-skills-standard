Generate a model policy and authorize the model-bound operation:

```bash
php artisan make:policy PostPolicy --model=Post
```

```php
public function update(User $user, Post $post): bool
{
    return $post->user_id === $user->id;
}
```

In the controller, call `$this->authorize('update', $post)` before mutating it. Keep policy methods typed and focused on authorization; do not inline role checks in controllers. Use a Form Request for input rules and `$request->validated()` for mass assignment. Policies are the right boundary for model-specific permissions, while global abilities belong in Gates.

