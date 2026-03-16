# Laravel Background Processing Reference

## Queued Jobs & Chaining

```php
// app/Jobs/ProcessPdfReport.php
public function handle(): void {
    // Heavy report logic
}

// Chaining dependent tasks
Bus::chain([
    new ProcessPdfReport($data),
    new NotifyUserOfReport($user),
])->dispatch();
```

## Events & Listeners

```php
// app/Events/UserRegistered.php
class UserRegistered { use Dispatchable, SerializesModels; }

// app/Listeners/SendWelcomeEmail.php
class SendWelcomeEmail implements ShouldQueue {
    public function handle(UserRegistered $event): void {
        // Queue handles this transparently
    }
}
```

## Batch Processing

```php
$batch = Bus::batch([
    new ImportPodcast(1),
    new ImportPodcast(2),
])->then(function (Batch $batch) {
    // All success
})->dispatch();
```
