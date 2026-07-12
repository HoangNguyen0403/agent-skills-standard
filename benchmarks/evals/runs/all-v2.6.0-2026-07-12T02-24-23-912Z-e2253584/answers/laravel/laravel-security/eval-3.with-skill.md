Call `env()` only in configuration files and use the config repository everywhere else:

```php
// config/services.php
'stripe' => ['key' => env('STRIPE_KEY')],

// application code
$key = config('services.stripe.key');
```

Do not call `env()` in controllers, jobs, policies, or services. Once configuration is cached, direct environment reads outside config can return unexpected values. Run `php artisan config:cache` in deployment validation and clear/rebuild the cache when configuration changes. This keeps environment access centralized and makes application behavior deterministic.

