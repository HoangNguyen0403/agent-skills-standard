Create middleware:

```bash
php artisan make:middleware SecurityHeaders
```

`app/Http/Middleware/SecurityHeaders.php`:

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

        $response->headers->set(
            'Strict-Transport-Security',
            'max-age=31536000; includeSubDomains'
        );
        $response->headers->set(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; frame-ancestors 'self';"
        );
        $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }
}
```

Register it globally in `bootstrap/app.php`:

```php
use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Configuration\Middleware;

->withMiddleware(function (Middleware $middleware): void {
    $middleware->prepend(SecurityHeaders::class);
    // Or use append(SecurityHeaders::class).
})
```

Only enable HSTS when the application is served entirely over HTTPS. Adjust the CSP directives for required CDNs, APIs, fonts, or inline assets.

Keep the middleware lightweight, cheap, and deterministic; avoid heavy computation in the global pipeline. Separate session concerns—such as regenerating the session after login to prevent session fixation—from this header middleware.
