Assert the status, JSON payload, structure, and important headers explicitly:

```php
$response = $this->postJson('/api/posts', ['title' => 'Hello']);

$response
    ->assertStatus(201)
    ->assertHeader('Content-Type', 'application/json')
    ->assertJson(['data' => ['title' => 'Hello']])
    ->assertJsonStructure(['data' => ['id', 'title', 'created_at']]);
```

Use `assertJsonValidationErrors()` for invalid input and assert `422` rather than only checking that the request failed. Keep assertions tied to the public API resource contract, not incidental database columns, so the test protects behavior without overfitting serialization internals.

