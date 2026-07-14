Assuming `SecurityHeaders` exists at `app/Http/Middleware/SecurityHeaders.php`, register it globally in `bootstrap/app.php`:

```php
<?php

use App\Http\Middleware\SecurityHeaders;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(SecurityHeaders::class);

        // Use prepend() when this middleware must run at the highest priority.
        // $middleware->prepend(SecurityHeaders::class);
    })
    ->withExceptions(function ($exceptions): void {
        //
    })
    ->create();
```

`SecurityHeaders` should add HSTS, CSP, `X-Frame-Options`, and `X-Content-Type-Options`. Keep the middleware lightweight, cheap and deterministic; avoid heavy computation in the global pipeline. Use Redis in scaled production to avoid file-session I/O and locking problems, and regenerate the session after login to prevent session fixation.
