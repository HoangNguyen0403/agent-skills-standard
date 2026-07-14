Install and initialize Horizon, then configure its supervisors:

```bash
composer require laravel/horizon
php artisan horizon:install
php artisan horizon
```

Define queue names, process counts, balancing, retries, and environment overrides in `config/horizon.php`. Protect `/horizon` with the authorization gate in `HorizonServiceProvider`; the dashboard must not be public by default. Horizon provides runtime visibility into throughput, latency, workers, and failed jobs, so use it for production observability rather than an unmonitored `queue:work` process.

