Assuming Laravel 10+ with a model such as `Post`:

1. Generate a policy:

```bash
php artisan make:policy PostPolicy --model=Post
```

This creates `app/Policies/PostPolicy.php`.

2. Define authorization rules:

```php
<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    public function view(User $user, Post $post): bool
    {
        return $post->published || $user->id === $post->user_id;
    }

    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->user_id;
    }
}
```

3. Laravel automatically discovers policies matching this convention:

```text
App\Models\Post
App\Policies\PostPolicy
```

For older Laravel versions, register it in `app/Providers/AuthServiceProvider.php`:

```php
protected $policies = [
    \App\Models\Post::class => \App\Policies\PostPolicy::class,
];
```

4. Authorize in a controller:

```php
public function update(Request $request, Post $post)
{
    $this->authorize('update', $post);

    // Update the post...
}
```

Or use policy middleware:

```php
Route::put('/posts/{post}', [PostController::class, 'update'])
    ->middleware('auth')
    ->can('update', 'post');
```

5. Check permissions in Blade:

```blade
@can('update', $post)
    <a href="{{ route('posts.edit', $post) }}">Edit</a>
@endcan
```

Unauthenticated or unauthorized users receive Laravel’s authorization response, typically HTTP `403`.
