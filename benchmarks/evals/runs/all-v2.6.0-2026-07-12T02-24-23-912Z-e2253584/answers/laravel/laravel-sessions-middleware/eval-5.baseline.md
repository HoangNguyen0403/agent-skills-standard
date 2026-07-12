In current Laravel applications using the streamlined bootstrap, register global middleware in `bootstrap/app.php`:

```php
return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(EnsureAccountActive::class);
    })
    ->create();
```

Use `prepend`, `append`, `web(append: [...])`, or `api(append: [...])` depending on the required order and scope. Older Laravel versions register global middleware in `app/Http/Kernel.php`. Confirm whether the middleware must run before authentication, sessions, CORS, or exception handling, and test both web and API pipelines rather than assuming all routes share the same group.

