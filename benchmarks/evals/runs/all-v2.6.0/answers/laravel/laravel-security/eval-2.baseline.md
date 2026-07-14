Use Laravel Gates for authorization checks based on the current user and a specific ability.

```php
// app/Providers/AppServiceProvider.php
use Illuminate\Support\Facades\Gate;
use App\Models\Post;

public function boot(): void
{
    Gate::define('update-post', function ($user, Post $post): bool {
        return $user->id === $post->user_id;
    });
}
```

Check permissions in controllers:

```php
public function update(Post $post)
{
    Gate::authorize('update-post', $post);

    // Update the post...
}
```

Other options:

```php
Gate::allows('update-post', $post);
Gate::denies('update-post', $post);
```

In Blade:

```blade
@can('update-post', $post)
    <a href="{{ route('posts.edit', $post) }}">Edit</a>
@endcan
```

For routes:

```php
Route::put('/posts/{post}', [PostController::class, 'update'])
    ->middleware('can:update-post,post');
```

Use Gates for general abilities; use Policies when permission logic is primarily tied to a model.
