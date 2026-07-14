Assuming a standard Laravel app:

1. Set the value in `.env`:

```env
SESSION_DRIVER=database
SESSION_LIFETIME=120
```

2. Read environment variables through `config/session.php`:

```php
'driver' => env('SESSION_DRIVER', 'file'),
'lifetime' => (int) env('SESSION_LIFETIME', 120),
```

Use the config value in application code:

```php
config('session.driver');
```

Do not call `env()` directly outside configuration files.

3. Clear the cached configuration:

```bash
php artisan optimize:clear
php artisan config:cache
```

Restart PHP-FPM or the queue workers afterward if applicable. Ensure the session driver’s required setup exists—for example, run `php artisan migrate` when using the `database` driver.
