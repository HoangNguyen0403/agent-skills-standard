Use response assertions that match the contract:

```php
$response = $this->getJson('/api/users');

$response->assertOk()
    ->assertJsonStructure(['data' => [['id', 'name']]])
    ->assertJsonPath('data.0.name', 'Ada');

$this->postJson('/api/users', [])->assertUnprocessable()
    ->assertJsonValidationErrors(['name', 'email']);
```

Other useful assertions include `assertCreated`, `assertNoContent`, `assertUnauthorized`, `assertForbidden`, `assertNotFound`, `assertJsonCount`, `assertExactJson`, redirects, headers, and `assertSee` for HTML. Assert status, shape, important values, authorization, and database effects without over-specifying irrelevant serialization details.

