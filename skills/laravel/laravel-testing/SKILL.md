---
name: laravel-testing
description: Write Pest feature tests with RefreshDatabase, mock external services, and create test data with Eloquent Factories in Laravel. Use when adding HTTP tests, configuring SQLite in-memory test database, or mocking payment services.
metadata:
  triggers:
    files:
    - 'tests/**/*.php'
    - 'phpunit.xml'
    keywords:
    - feature
    - unit
    - mock
    - factory
    - sqlite
---
# Laravel Testing

## **Priority: P1 (HIGH)**

## Workflow: Test New Feature

1. **Generate factory** — `php artisan make:factory PostFactory --model=Post`.
2. **Write feature test** — Use Pest with `RefreshDatabase` for isolation.
3. **Mock externals** — Use `$this->mock(Service::class)` for third-party calls.
4. **Assert response** — Chain `assertStatus()`, `assertJson()`, `assertJsonStructure()`.
5. **Run with SQLite** — Set `DB_CONNECTION=sqlite` and `DB_DATABASE=:memory:` in `phpunit.xml`.

## Pest Feature Test Example

See [implementation examples](references/implementation.md#pest-feature-test-example) for Pest feature tests and test directory structure.

## Implementation Guidelines

### Pest & Modern Testing

- **Feature Tests**: Use `uses(RefreshDatabase::class)` at top of Pest files. Example: `it('creates post', fn() => $this->postJson('/api/posts', [...])` verifies database rolled back after each test.
- **Transactions**: For faster but non-truncating isolation, use **`DatabaseTransactions`**.

### Mocking & External Services

- **Service Mocking**: Use **`$this->mock(PaymentService::class)`** with **`shouldReceive('charge')->once()->with(100)`** to assert interaction.
- **Loose Verification**: Use **`$this->spy()`** for behavior validation without strict ordering.
- **Network Safety**: **Never make real network calls** in automated tests.

### Test Data & Infrastructure

- **Factories**: Create test data via **`Post::factory()->count(3)->create(['user_id' => $id])`**.
- **Definition**: Implement **`definition(): array`** using **`fake()`** in factory classes.
- **Generation**: Run **`php artisan make:factory PostFactory --model=Post`**.
- **SQLite Support**: In **`phpunit.xml`**, set `DB_CONNECTION' value='sqlite'` and `DB_DATABASE' value=':memory:'` for in-memory, lightning-fast tests.

### HTTP Assertions

- **Fluent Assertions**: Chain **`assertStatus(201)`**, **`assertJson(['data' => ...])`**, and **`assertJsonStructure`**.
- **Header Verification**: Use **`assertHeader('Content-Type', 'application/json')`**.

## Anti-Patterns

- **No real network calls**: Always mock or stub external services.
- **No state leakage between tests**: Use `RefreshDatabase` trait.
- **No `DB::table()->insert()`**: Never DB::table()->insert() raw data in tests — use Eloquent Factories instead.
- **No heavy computations in unit tests**: Move to Feature layer.

## References

- [Testing & Mocking Guide](references/implementation.md)