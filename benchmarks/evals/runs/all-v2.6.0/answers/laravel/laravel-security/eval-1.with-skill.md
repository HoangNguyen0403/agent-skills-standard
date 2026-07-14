Assuming a `Post` model with an `author_id` column and `User::isAdmin()`:

1. Generate the policy:

```bash
php artisan make:policy PostPolicy --model=Post
```

2. Implement `app/Policies/PostPolicy.php`:

```php
<?php

namespace App\Policies;

use App\Models\Post;
use App\Models\User;

class PostPolicy
{
    public function view(User $user, Post $post): bool
    {
        return $post->is_published || $user->id === $post->author_id;
    }

    public function update(User $user, Post $post): bool
    {
        return $user->id === $post->author_id;
    }

    public function delete(User $user, Post $post): bool
    {
        return $user->id === $post->author_id;
    }
}
```

Laravel can automatically discover this policy by convention. Otherwise register it in `AuthServiceProvider`.

3. Authorize in controllers:

```php
public function update(UpdatePostRequest $request, Post $post)
{
    $this->authorize('update', $post);

    $post->update($request->validated());

    return redirect()->route('posts.show', $post);
}
```

4. Add an admin bypass and global Gate in `app/Providers/AuthServiceProvider.php`:

```php
use App\Models\User;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::before(fn (User $user) => $user->isAdmin() ? true : null);

    Gate::define('admin', fn (User $user): bool => $user->isAdmin());
}
```

Use global permissions with:

```php
Gate::allows('admin');
```

or in Blade:

```blade
@can('admin')
    <a href="/admin">Admin</a>
@endcan
```

Prefer Policies for model-bound checks and Gates for global permissions. Do not inline role checks or add custom authentication logic.

5. Secure input handling:

```php
class UpdatePostRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
        ];
    }
}
```

Define `$fillable` on `Post` and use `$request->validated()`—never `$request->all()`.

6. Add CSRF protection to every Blade form:

```blade
<form method="POST" action="{{ route('posts.update', $post) }}">
    @csrf
    @method('PUT')
    <!-- fields -->
</form>
```

CSRF is active on web routes through web middleware. Exclude only trusted third-party callbacks, such as `->except(['/webhook'])`.

7. Keep configuration access secure: read environment values only in configuration files. Do not call `env()` outside `config/*.php` or in controllers; use `config()` in controllers, for example:

```php
$key = config('app.key');
```

Then validate configuration caching:

```bash
php artisan config:cache
```
