---
name: laravel-testing
description: Write Pest feature tests with RefreshDatabase, mock external services, and create test data with Eloquent Factories in Laravel. Use when adding HTTP tests, configuring SQLite in-memory test database, or mocking payment services.
metadata:
  triggers:
    files:
    - 'tests/**/*.php'
    - 'phpunit.xml'
    keywords:
    - laravel testing
    - pest feature test
    - laravel pest
    - laravel unit test
    - laravel tests
    - RefreshDatabase
    - Eloquent factory
    - Eloquent factories
    - laravel mock
    - sqlite in-memory test
---
# Laravel Testing

## **Priority: P1 (HIGH)**

Universal anti-slop rules (identity fixtures, tautologies, skip/focus, mock echoing, bug-first lock, sleeps, shallow
assertions, coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Laravel deltas
follow.

## Stack Deltas

- **Pest feature tests**: `uses(RefreshDatabase::class)` at the top of the file. Example:
  `it('creates a post', fn() => $this->postJson('/api/posts', [...]))`; the database rolled back after each test.
- **Transactions**: `DatabaseTransactions` for faster but non-truncating isolation.
- **Service mocking (`[BE-TEST-04]`)**: `$this->mock(PaymentService::class)` with
  `shouldReceive('charge')->once()->with(100)`; use `$this->spy()` for loose verification; never make real network calls.
- **Factories & DB (`[BE-TEST-02]`)**: create data via `Post::factory()->count(3)->create(['user_id' => $id])`. In
  `phpunit.xml`, set `<env name='DB_CONNECTION' value='sqlite'/>` and `<env name='DB_DATABASE' value=':memory:'/>`.
- **HTTP assertions (`[BE-TEST-03]`)**: chain `assertStatus(201)`, `assertJson(['data' => ...])`, `assertJsonStructure`,
  and `assertHeader`; never assert status alone.
- **Coverage**: diagnostic and project-configured; verify risk-weighted critical paths.

## Anti-Patterns

- **No real network calls**: always mock or stub external services.
- **No state leakage between tests**: use `RefreshDatabase`.
- **No raw inserts**: never DB::table()->insert() test data; use Eloquent Factories.
