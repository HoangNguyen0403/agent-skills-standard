1. Install the Redis client:

```bash
composer require predis/predis
```

2. Configure `.env`:

```dotenv
SESSION_DRIVER=redis
SESSION_CONNECTION=default

REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

Ensure `config/session.php` uses the configured driver:

```php
'driver' => env('SESSION_DRIVER', 'file'),
'connection' => env('SESSION_CONNECTION', 'default'),
```

Use `config('session.driver')` in application code—never access `env('SESSION_DRIVER')` directly.

3. Clear cached configuration:

```bash
php artisan config:clear
```

Redis avoids file-session I/O and locking problems in scaled production environments.

4. Prevent session fixation after successful authentication:

```php
$request->session()->regenerate();
```

Invalidate the session on logout:

```php
$request->session()->invalidate();
$request->session()->regenerateToken();
```

Keep any global middleware lightweight, cheap, and deterministic.
