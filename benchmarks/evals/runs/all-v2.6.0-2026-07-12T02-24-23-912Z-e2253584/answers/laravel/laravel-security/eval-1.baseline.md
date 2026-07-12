Generate a policy for the model and define ability methods:

```bash
php artisan make:policy PostPolicy --model=Post
```

```php
public function update(User $user, Post $post): bool
{
    return $post->user_id === $user->id;
}
```

Authorize in a controller with `$this->authorize('update', $post)`, in a Form Request's `authorize()`, or with route model binding and `can:update,post` middleware. Register/discover the policy according to the Laravel version. Policies must enforce authorization server-side for every sensitive action; hiding UI controls is not protection. Test owner, non-owner, unauthenticated, and administrator cases.

