In Laravel, use `env()` only inside files under `config/`.

```php
// config/services.php
return [
    'api_url' => env('API_URL'),
];
```

Access the value elsewhere through the configuration repository:

```php
$url = config('services.api_url');
```

Do not call `env()` in controllers, models, services, jobs, middleware, or views. Laravel’s `config:cache` can make environment values unavailable outside configuration files.

After changing configuration, clear and rebuild the cache:

```bash
php artisan config:clear
php artisan config:cache
```
