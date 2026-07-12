Register the security middleware globally in the application bootstrap configuration:

```php
use App\Http\Middleware\SecurityHeaders;

return Application::configure(basePath: dirname(__DIR__))
    ->withMiddleware(function ($middleware): void {
        $middleware->append(SecurityHeaders::class);
    })
    ->create();
```

Use `prepend()` when the middleware must run before the existing global stack. Global middleware should be cheap and deterministic because it runs on every request. Keep session/auth-specific behavior in the appropriate route group when it does not apply globally, and verify registration with an HTTP test that asserts the headers or behavior on multiple routes.

