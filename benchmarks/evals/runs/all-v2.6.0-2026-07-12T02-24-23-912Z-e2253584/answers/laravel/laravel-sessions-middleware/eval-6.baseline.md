Application code should read session settings through `config('session.*')`, not directly through `env()`:

```php
$driver = config('session.driver');
$request->session()->put('key', $value);
```

Check `config/session.php` maps the intended environment variable, then clear and rebuild cached configuration after changing `.env`:

```bash
php artisan config:clear
php artisan config:cache
```

In production, workers and long-running processes must be restarted if they retain old configuration. Verify the deployed environment, config cache, Redis/database connectivity, cookie domain/secure settings, and that the request uses the `web` session middleware. Never expose secrets while debugging configuration.

