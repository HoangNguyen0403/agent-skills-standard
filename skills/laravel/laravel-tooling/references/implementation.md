# Laravel Tooling Reference

## Custom Artisan Commands

```php
// app/Console/Commands/CleanTempFiles.php
protected $signature = 'app:clean-temp';

public function handle()
{
    Storage::deleteDirectory('temp');
    $this->info('Temp files cleared!');
}
```

## Vite Assets

```html
<!-- resources/views/layouts/app.blade.php -->
@vite(['resources/css/app.css', 'resources/js/app.js'])
```

## Custom Artisan Command Example

```php
// app/Console/Commands/SendNewsletters.php
class SendNewsletters extends Command {
    protected $signature = 'newsletters:send {--queue : Queue the emails}';
    protected $description = 'Send newsletters to all subscribers';

    public function handle(): int {
        $subscribers = User::whereNotNull('subscribed_at')->get();
        $this->info("Sending to {$subscribers->count()} subscribers...");
        // dispatch jobs or send directly
        return self::SUCCESS;
    }
}
```

## Tooling Directory Structure

```text
project/
├── app/Console/        # Custom Artisan commands
├── resources/js/       # Frontend assets (Vite)
└── pint.json           # Code styling
```
