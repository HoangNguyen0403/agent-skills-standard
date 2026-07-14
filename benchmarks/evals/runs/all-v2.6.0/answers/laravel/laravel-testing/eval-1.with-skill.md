Create a factory and a Pest feature test that exercises the HTTP boundary:

```bash
php artisan make:factory PostFactory --model=Post
```

```php
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a post', function () {
    $response = $this->postJson('/api/posts', [
        'title' => 'Example',
        'body' => 'Content',
    ]);

    $response->assertStatus(201)->assertJsonStructure(['data' => ['id', 'title']]);
});
```

Use factories for setup, isolate database state with `RefreshDatabase`, and mock external services. Run the test against SQLite in memory when possible and never make real network calls from the suite.

