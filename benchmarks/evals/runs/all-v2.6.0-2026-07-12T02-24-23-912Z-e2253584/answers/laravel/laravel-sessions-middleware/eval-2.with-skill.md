Generate middleware and keep its `handle()` method focused:

```bash
php artisan make:middleware EnsureTokenIsValid
```

```php
public function handle(Request $request, Closure $next): Response
{
    abort_unless($request->user(), 401);
    return $next($request);
}
```

Register the middleware through Laravel's `withMiddleware()` configuration in `bootstrap/app.php`, either globally or under an explicit alias/group depending on the desired scope. Avoid heavy computation in global middleware; delegate complex checks to a service. Use `config()` for configuration and test both rejection and pass-through behavior.

