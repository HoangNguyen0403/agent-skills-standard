Create a dedicated middleware that adds security headers and register it globally:

```php
public function handle(Request $request, Closure $next): Response
{
    $response = $next($request);
    $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    $response->headers->set('X-Frame-Options', 'DENY');
    $response->headers->set('X-Content-Type-Options', 'nosniff');
    return $response;
}
```

Add a carefully designed CSP rather than copying a policy that breaks the application, and register the middleware using `withMiddleware(fn ($middleware) => $middleware->append(SecurityHeaders::class))` in `bootstrap/app.php`. Test the headers on normal and error responses. Keep the middleware lightweight and avoid embedding business logic.

