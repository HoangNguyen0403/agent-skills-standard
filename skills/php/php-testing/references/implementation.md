# PHP Testing Reference

## Framework Patterns (Pest & PHPUnit)

### Pest (Modern DX)

```php
test('user can be created', function () {
    $repo = mock(UserRepository::class);
    $repo->shouldReceive('save')->once()->andReturn(true);

    $service = new UserService($repo);
    expect($service->create(['name' => 'Hoang']))->toBeTrue();
});
```

### PHPUnit (Standard Persistence)

```php
public function test_math_logic(): void
{
    $this->assertSame(4, 2 + 2);
}
```
