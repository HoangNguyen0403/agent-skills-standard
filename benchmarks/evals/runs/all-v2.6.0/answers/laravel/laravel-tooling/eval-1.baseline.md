Generate a command and implement its `handle()` method:

```bash
php artisan make:command PurgeDrafts
```

```php
protected $signature = 'drafts:purge {--days=30}';
protected $description = 'Delete old draft posts';

public function handle(): int
{
    $days = (int) $this->option('days');
    $count = Post::where('status', 'draft')->where('updated_at', '<', now()->subDays($days))->delete();
    $this->info("Deleted {$count} drafts.");
    return self::SUCCESS;
}
```

Validate options, use `chunkById` for large deletes when callbacks/side effects are needed, authorize destructive production execution operationally, and return `self::FAILURE` on errors. Add command tests and document scheduling/exit behavior. Do not put secrets in command arguments that may appear in process listings.

