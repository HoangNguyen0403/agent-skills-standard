Create middleware that adds headers to the response after the downstream request runs:

```php
public function handle(Request $request, Closure $next): Response
{
    $response = $next($request);
    $response->headers->set('X-Content-Type-Options', 'nosniff');
    $response->headers->set('X-Frame-Options', 'SAMEORIGIN');
    $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
    return $response;
}
```

Register it globally or on the relevant group. Add a carefully designed Content-Security-Policy rather than copying a permissive one, and consider HSTS only when every production path is HTTPS. Avoid overriding security headers set by trusted infrastructure, document exceptions, and test headers on HTML/API/error responses.

