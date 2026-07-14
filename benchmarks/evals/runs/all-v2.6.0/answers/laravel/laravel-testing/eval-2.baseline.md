Add `RefreshDatabase` to the test class or Pest file:

```php
uses(RefreshDatabase::class);

it('stores a user', function () {
    $this->post('/users', User::factory()->make()->toArray())
        ->assertRedirect();
});
```

Laravel migrates the test database as needed and wraps tests in transactions where supported, resetting state between tests. Configure a dedicated test database in `phpunit.xml`/environment, never point tests at production data, and avoid relying on test order. Use `DatabaseTransactions` only when its transaction behavior fits the code under test; jobs/processes using separate connections may require a different isolation strategy.

