1. Install/configure Redis support:

```bash
composer require predis/predis
```

Or enable the PHP `redis` extension (`phpredis`).

2. Update `.env`:

```env
SESSION_DRIVER=redis
SESSION_CONNECTION=default

REDIS_CLIENT=predis
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=null
REDIS_PORT=6379
```

For a named Redis connection, use its name instead of `default`.

3. Ensure `config/session.php` uses the environment values:

```php
'driver' => env('SESSION_DRIVER', 'database'),
'connection' => env('SESSION_CONNECTION'),
```

4. Clear cached configuration:

```bash
php artisan optimize:clear
```

Verify Redis is running, then access the application. Laravel will store session data in Redis using the configured connection.
