Use Gates for global permission checks, and Policies for model-specific authorization.

```php
// app/Providers/AuthServiceProvider.php

use App\Models\User;
use Illuminate\Support\Facades\Gate;

public function boot(): void
{
    Gate::before(fn (User $user) =>
        $user->isAdmin() ? true : null
    );

    Gate::define('admin', fn (User $user): bool =>
        $user->isAdmin()
    );

    Gate::define('publish-posts', fn (User $user): bool =>
        $user->can_publish
    );
}
```

Check a Gate in a controller:

```php
use Illuminate\Support\Facades\Gate;

if (Gate::allows('publish-posts')) {
    // Permission granted
}

Gate::authorize('publish-posts');
```

Use it in Blade:

```blade
@can('admin')
    <a href="{{ route('admin.dashboard') }}">Admin dashboard</a>
@endcan
```

For model-bound checks, generate and use a Policy instead:

```bash
php artisan make:policy PostPolicy --model=Post
```

```php
$this->authorize('update', $post);
```

Avoid inline role checks such as `$user->role === 'admin'`; centralize authorization in Gates and Policies.
