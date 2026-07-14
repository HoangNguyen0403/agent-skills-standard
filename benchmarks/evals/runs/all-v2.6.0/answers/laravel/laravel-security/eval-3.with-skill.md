Prevent `env()` usage outside `config/*.php`:

```php
// config/app.php
'key' => env('APP_KEY'),
```

Use configuration access in application code:

```php
// Controller or service
$key = config('app.key');
```

Never call `env()` in controllers—or anywhere not in configuration files. Search the codebase for `env(`, move legitimate calls into configuration files, and replace application-level calls with `config()`.

Validate the boundary with:

```bash
php artisan config:cache
```

This ensures environment values are read only in configuration files and remain available through Laravel’s configuration system.
