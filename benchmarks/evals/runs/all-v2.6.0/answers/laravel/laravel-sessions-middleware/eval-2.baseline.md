Create the middleware:

```bash
php artisan make:middleware EnsureUserIsActive
```

Edit `app/Http/Middleware/EnsureUserIsActive.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->is_active) {
            abort(403, 'Your account is inactive.');
        }

        return $next($request);
    }
}
```

Register it in `bootstrap/app.php`:

```php
use App\Http\Middleware\EnsureUserIsActive;
use Illuminate\Foundation\Configuration\Middleware;

->withMiddleware(function (Middleware $middleware): void {
    $middleware->alias([
        'active' => EnsureUserIsActive::class,
    ]);
})
```

Apply it to a route:

```php
Route::middleware(['auth', 'active'])->group(function () {
    Route::get('/dashboard', function () {
        return view('dashboard');
    });
});
```

For Laravel versions using `app/Http/Kernel.php`, add the alias to `$middlewareAliases` instead:

```php
protected $middlewareAliases = [
    'active' => \App\Http\Middleware\EnsureUserIsActive::class,
];
```
