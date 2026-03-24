# Laravel Sessions & Middleware Reference

## Custom Middleware for High-Density Security

```php
// app/Http/Middleware/EnsureSecureHeaders.php
public function handle(Request $request, Closure $next): Response
{
    $response = $next($request);
    $response->headers->set('X-Frame-Options', 'DENY');
    $response->headers->set('X-Content-Type-Options', 'nosniff');
    return $response;
}
```

## Advanced Session Management

```php
// Manual session regeneration
$request->session()->regenerate();

// Context-aware session driver (config/session.php)
'driver' => env('SESSION_DRIVER', 'redis'),
```

## PSR-15 Middleware Adapter

```php
// Wrapping PSR-15 middleware if needed
use Symfony\Bridge\PsrHttpMessage\Factory\PsrHttpFactory;
```

## Security Headers Middleware

```php
// app/Http/Middleware/SecurityHeaders.php
class SecurityHeaders {
    public function handle(Request $request, Closure $next): Response {
        $response = $next($request);
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        return $response;
    }
}
```

## Middleware Directory Structure

```text
app/Http/
├── Middleware/         # Custom logic layers
└── Kernel.php          # Global/Group registration
```
