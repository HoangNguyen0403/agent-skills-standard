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
