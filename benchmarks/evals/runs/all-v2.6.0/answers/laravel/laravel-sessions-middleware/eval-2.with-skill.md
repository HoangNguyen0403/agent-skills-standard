Create the middleware:

```bash
php artisan make:middleware EnsureTokenIsValid
```

`app/Http/Middleware/EnsureTokenIsValid.php`:

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureTokenIsValid
{
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless(
            hash_equals((string) config('app.internal_token'), (string) $request->header('X-Internal-Token')),
            403
        );

        return $next($request);
    }
}
```

Register it in `bootstrap/app.php`:

```php
use App\Http\Middleware\EnsureTokenIsValid;
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Configuration\Middleware;

->withMiddleware(function (Middleware $middleware): void {
    $middleware->append(EnsureTokenIsValid::class);
    // Use prepend() when this must run before existing global middleware.
    $middleware->append(SecurityHeaders::class);
})
```

For security headers, create `SecurityHeaders` and keep the middleware lightweight, cheap and deterministic:

```php
public function handle(Request $request, Closure $next): Response
{
    $response = $next($request);

    $response->headers->set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
    );
    $response->headers->set('Content-Security-Policy', "default-src 'self'");
    $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
    $response->headers->set('X-Content-Type-Options', 'nosniff');

    return $response;
}
```

If the middleware participates in authentication, call:

```php
$request->session()->regenerate(); // Prevents session fixation.
```

On logout:

```php
$request->session()->invalidate();
```

For scaled production environments, use `SESSION_DRIVER=redis` with `predis/predis`; avoid file-session I/O and locking problems. Read the driver through `config('session.driver')`, never directly through `env()`.
