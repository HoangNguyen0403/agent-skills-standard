Define a named limiter and attach it to the API route group:

```php
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('api', function ($request) {
    return Limit::perMinute(60)->by(
        $request->user()?->id ?: $request->ip()
    );
});
```

```php
Route::prefix('v1')
    ->middleware(['throttle:api', 'auth:sanctum'])
    ->group(function () {
        Route::get('/posts', [PostController::class, 'index']);
    });
```

Key authenticated users by user ID and anonymous callers by IP so one user cannot consume a shared global bucket. Tune the limit by endpoint sensitivity and return Laravel's normal `429 Too Many Requests` response, including retry information where appropriate. Keep the limiter definition in the application service-provider bootstrap path and verify both authenticated and anonymous behavior with feature tests.

