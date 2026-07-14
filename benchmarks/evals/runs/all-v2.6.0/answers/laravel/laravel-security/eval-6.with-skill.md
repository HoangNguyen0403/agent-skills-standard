Assume `User::isAdmin(): bool` exists and posts have an `user_id` owner.

1. Generate a policy:

```bash
php artisan make:policy PostPolicy --model=Post
```

2. Implement model authorization in `app/Policies/PostPolicy.php`:

```php
<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    public function view(User $user, Post $post): bool
    {
        return $post->user_id === $user->id;
    }

    public function update(User $user, Post $post): bool
    {
        return $post->user_id === $user->id;
    }

    public function delete(User $user, Post $post): bool
    {
        return $post->user_id === $user->id;
    }
}
```

Register the policy if your Laravel version does not auto-discover it:

```php
// app/Providers/AuthServiceProvider.php

protected $policies = [
    \App\Models\Post::class => \App\Policies\PostPolicy::class,
];
```

3. Add an admin Gate and bypass:

```php
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::before(fn ($user) => $user->isAdmin() ? true : null);

    Gate::define('admin', fn ($user): bool => $user->isAdmin());
}
```

Use Gates for global permissions and Policies for model-bound checks:

```php
if (Gate::allows('admin')) {
    // Admin-only operation
}
```

In Blade:

```blade
@can('admin')
    <a href="{{ route('admin.dashboard') }}">Admin dashboard</a>
@endcan
```

4. Authorize in controllers:

```php
public function update(UpdatePostRequest $request, Post $post)
{
    $this->authorize('update', $post);

    $post->update($request->validated());

    return redirect()->route('posts.show', $post);
}
```

5. Validate mass assignment with a Form Request:

```php
// app/Http/Requests/UpdatePostRequest.php

public function rules(): array
{
    return [
        'title' => ['required', 'string', 'max:255'],
        'body' => ['required', 'string'],
    ];
}
```

Define model fields explicitly:

```php
// app/Models/Post.php

protected $fillable = ['title', 'body'];
```

Use `$request->validated()`, never `$request->all()`.

6. Protect forms with CSRF:

```blade
<form method="POST" action="{{ route('posts.update', $post) }}">
    @csrf
    @method('PUT')
    <!-- fields -->
</form>
```

CSRF is active on web routes through web middleware. Exclude only trusted third-party callbacks, such as `/webhook`, when necessary.

Keep environment access inside configuration files only. Do not call `env()` in controllers or other application code; use configuration values instead:

```php
$key = config('app.key');
```

After configuration changes, validate caching:

```bash
php artisan config:cache
```

For larger role and permission matrices, use `spatie/laravel-permission` instead of duplicating role logic.
