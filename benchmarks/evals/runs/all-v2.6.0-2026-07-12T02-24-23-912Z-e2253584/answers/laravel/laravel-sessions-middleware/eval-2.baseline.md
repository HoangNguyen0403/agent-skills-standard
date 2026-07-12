Generate middleware and implement `handle` around the next request:

```bash
php artisan make:middleware EnsureAccountActive
```

```php
public function handle(Request $request, Closure $next): Response
{
    if ($request->user() && ! $request->user()->active) {
        abort(403, 'Account inactive.');
    }

    return $next($request);
}
```

Register it as an alias or in the appropriate global/group middleware list for the Laravel version, then attach it to routes/groups. Keep middleware focused and order-sensitive concerns deliberate (authentication must precede a middleware that reads `user()`). Test pass-through, rejection, unauthenticated behavior, and response headers/side effects.

