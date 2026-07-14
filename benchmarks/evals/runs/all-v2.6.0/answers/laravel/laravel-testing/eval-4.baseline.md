Use Laravel's HTTP client fakes for outbound HTTP and the framework's mail/event/queue fakes for those boundaries:

```php
Http::fake(['api.example.test/*' => Http::response(['ok' => true], 200)]);

$this->post('/sync')->assertRedirect();

Http::assertSent(fn (Request $request) => $request->url() === 'https://api.example.test/items');
```

Use `Mail::fake()`, `Event::fake()`, `Queue::fake()`, or `Notification::fake()` before exercising the code, then assert dispatch/send details. Prefer dependency injection and a fake implementation for non-HTTP SDKs. Tests should verify the application reaction and request contract without making real network calls; reserve a separate integration suite for real providers.

