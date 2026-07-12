Define the session driver in `config/session.php` from an environment variable, then read it through configuration:

```php
'driver' => env('SESSION_DRIVER', 'file'),
```

Application code should use `config('session.driver')`, not `env('SESSION_DRIVER')`. If a change is not visible, clear the cached configuration with `php artisan config:clear` and rebuild it during deployment. For scaled production, prefer Redis or Memcached over the file driver and install/configure the corresponding client. Confirm the effective config in the target runtime rather than assuming the `.env` file was loaded.

