Create the command with Artisan's generator:

```bash
php artisan make:command SendNewsletters
```

Define an explicit signature and return an integer from `handle()`:

```php
protected $signature = 'newsletters:send {--queue}';

public function handle(): int
{
    // coordinate the use case or dispatch a job
    return self::SUCCESS;
}
```

Commands under `app/Console/Commands/` are auto-discovered. Keep heavy work in queued Jobs and use the command as an operator-facing entry point. Schedule it in the current Laravel bootstrap configuration when needed, and run Pint before merging.

