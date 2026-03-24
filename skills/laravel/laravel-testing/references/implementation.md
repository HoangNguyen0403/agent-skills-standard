# Laravel Testing Reference

## Pest (Standard)

```php
// tests/Feature/RegistrationTest.php
test('new users can register', function () {
    $response = $this->post('/register', [
        'name' => 'Hoang',
        'email' => 'hoang@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $this->assertAuthenticated();
    $response->assertRedirect(route('dashboard'));
});
```

## In-Memory Database

```php
// phpunit.xml
<env name="DB_CONNECTION" value="sqlite"/>
<env name="DB_DATABASE" value=":memory:"/>
```

## Pest Feature Test Example

```php
// tests/Feature/PostTest.php
uses(RefreshDatabase::class);

it('creates a post and returns 201', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->postJson('/api/posts', ['title' => 'Hello', 'body' => 'World'])
        ->assertStatus(201)
        ->assertJson(['data' => ['title' => 'Hello']]);

    $this->assertDatabaseHas('posts', ['title' => 'Hello']);
});
```

## Test Directory Structure

```text
tests/
├── Feature/            # Integration/HTTP tests
├── Unit/               # Isolated logic tests
└── TestCase.php
```
