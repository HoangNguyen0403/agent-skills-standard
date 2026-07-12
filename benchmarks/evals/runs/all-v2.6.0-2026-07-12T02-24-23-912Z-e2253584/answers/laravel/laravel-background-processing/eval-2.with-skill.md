Install Horizon, publish its configuration, and run it as the production queue supervisor:

```bash
composer require laravel/horizon
php artisan horizon:install
php artisan horizon
```

Configure supervisors and queues in `config/horizon.php`, including process counts, balance strategy, retries, and environment-specific settings. Protect the `/horizon` dashboard with its authorization gate in `HorizonServiceProvider`; do not expose it publicly without access control. Horizon gives queue throughput, runtime, failures, and worker health visibility. Use it instead of an unmonitored `queue:work` process in production, and configure failed-job persistence and alerts for exhausted jobs.

