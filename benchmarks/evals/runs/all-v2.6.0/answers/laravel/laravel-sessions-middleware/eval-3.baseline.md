Assuming Laravel 10/11, create middleware:

```bash
php artisan make:middleware SecurityHeaders
```

`app/Http/Middleware/SecurityHeaders.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set(
            'Permissions-Policy',
            'camera=(), microphone=(), geolocation=()'
        );

        if ($request->isSecure()) {
            $response->headers->set(
                'Strict-Transport-Security',
                'max-age=31536000; includeSubDomains'
            );
        }

        // Customize this for your scripts, styles, images, and API endpoints.
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'"
        );

        return $response;
    }
}
```

Register it globally.

For Laravel 11, update `bootstrap/app.php`:

```php
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeaders::class);
    })
    ->create();
```

For Laravel 10, add it to `$middleware` in `app/Http/Kernel.php`:

```php
protected $middleware = [
    // ...
    \App\Http\Middleware\SecurityHeaders::class,
];
```

Verify the response:

```bash
curl -I https://example.com
```

Only enable `Strict-Transport-Security` when HTTPS is correctly enforced, and test the `Content-Security-Policy` against the application’s actual frontend dependencies before deploying.
