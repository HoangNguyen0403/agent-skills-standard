---
name: PHP Testing
description: Unit and integration testing standards for PHP applications.
metadata:
  labels: [php, testing, phpunit, pest, tdd]
  triggers:
    files: ['tests/**/*.php', 'phpunit.xml']
    keywords: [phpunit, pest, mock, assert, tdd]
---

# PHP Testing

## **Priority: P1 (HIGH)**

Standardized practices for automated testing and TDD in PHP.

## Implementation Guidelines

- **Framework Choice**: Use **PHPUnit** for standard enterprise projects or **Pest** for a modern, expressive DX.
- **TDD Cycle**: Follow the Red-Green-Refactor cycle. Write a failing test before implementing logic.
- **Unit Testing**: Test classes in isolation. Use **Mockery** or PHPUnit mocks to stub dependencies.
- **Assertions**: Use strict assertions (e.g., `assertSame`, `assertCount`). Avoid generic `assertTrue` where specific ones exist.
- **Data Providers**: Use `@dataProvider` (PHPUnit) or `with()` (Pest) to run tests against multiple data sets.
- **Component Specific**:
  - **Models**: Focus on business logic and validation.
  - **Services**: Mock external APIs and repositories.
  - **Controllers**: Use integration tests to verify status codes and JSON structures.

## Anti-Patterns

- **Testing Private Methods**: Test public behavior only. Private methods are implementation details.
- **Fragile Mocks**: Avoid "mocking everything"; mock only the boundaries of your system.
- **Slow Tests**: Keep unit tests fast by avoiding real database or network calls (use sqlite in-memory or mocks).
- **Ignoring Coverage**: Ensure critical paths have coverage, but aim for quality over "100% metrics".

## Code

```php
// Pest Example
test('user can be created', function () {
    $repo = mock(UserRepository::class);
    $repo->shouldReceive('save')->once()->andReturn(true);

    $service = new UserService($repo);
    expect($service->create(['name' => 'Hoang']))->toBeTrue();
});

// PHPUnit Example
public function test_math_logic(): void
{
    $this->assertSame(4, 2 + 2);
}
```
