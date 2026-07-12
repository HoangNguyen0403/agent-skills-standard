Use `env()` only while building configuration, normally in `config/*.php`:

```php
// config/services.php
'payments' => ['key' => env('PAYMENTS_KEY')],

// application code
$key = config('services.payments.key');
```

This matters because `php artisan config:cache` makes the cached configuration the runtime source; direct `env()` calls outside config can return null or stale behavior. After changing environment values, clear/rebuild cached config as part of deployment. Do not commit secrets, log them, or expose them through responses; use the framework's secret management/deployment environment securely.

