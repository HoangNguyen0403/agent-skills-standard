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
