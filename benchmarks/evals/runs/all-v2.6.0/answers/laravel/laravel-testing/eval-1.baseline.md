Create a Pest feature test with `php artisan make:test PostTest` and exercise the HTTP boundary:

```php
it('creates a post', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user)->postJson('/api/posts', [
        'title' => 'Test post',
        'body' => 'Content',
    ]);

    $response->assertCreated()->assertJsonPath('data.title', 'Test post');
    $this->assertDatabaseHas('posts', ['user_id' => $user->id, 'title' => 'Test post']);
});
```

Use feature tests for routes, middleware, validation, authorization, persistence, and response contracts; keep pure domain/unit tests separate. Add negative cases and isolate external services with fakes. Run the test with the project's configured Pest command.

