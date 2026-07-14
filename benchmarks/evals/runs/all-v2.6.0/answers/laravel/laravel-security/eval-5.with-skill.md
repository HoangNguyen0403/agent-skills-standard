Assuming the forms use Laravel’s `web` routes, CSRF protection is enabled by the `web` middleware and `CSRF middleware` by default.

Add `@csrf` inside every Blade form:

```blade
<form method="POST" action="{{ route('posts.store') }}">
    @csrf

    <!-- fields -->

    <button type="submit">Save</button>
</form>
```

For `PUT`, `PATCH`, or `DELETE` forms, include both directives:

```blade
<form method="POST" action="{{ route('posts.destroy', $post) }}">
    @csrf
    @method('DELETE')

    <button type="submit">Delete</button>
</form>
```

Do not disable CSRF globally. Exclude only trusted third-party callbacks, such as `/webhook`, when necessary:

```php
->withMiddleware(function ($middleware) {
    $middleware->validateCsrfTokens(except: [
        '/webhook',
    ]);
});
```

Ensure the routes remain in `routes/web.php` or otherwise use the `web` middleware.
