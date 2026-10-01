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

## Core Rule Anchors

- **`[BE-TEST-01]` Parameterized Tests for Equivalent Cases**: Prefer `dataset` in Pest or PHPUnit data providers for equivalent inputs and boundary permutations. Distinct scenarios may stay separate test methods. Reviewers must not demand parameterized rewrites without a behavioral gap.
- **`[BE-TEST-02]` Ban on Brittle DB Mock String Matching**: Do not use string-matching mocks for raw SQL queries. Test pure domain calculations directly, or use SQLite in-memory / real DB for repository verification.
- **`[BE-TEST-03]` Ban on Shallow Assertions**: Never assert only `assertStatus(200)` without inspecting JSON response structures, payload fields, and invariants.
- **`[BE-TEST-04]` Ban on Pass-Through Interface Mocks**: Repositories and service handlers must test contract compliance and error mapping. Ban 1:1 pass-through mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Implementation Guidelines

- **Pest Feature Tests**: Use `uses(RefreshDatabase::class)` at top of Pest files. Example: `it('creates post', fn() => $this->postJson('/api/posts', [...])` verifies database rolled back after each test.
- **Transactions**: For faster but non-truncating isolation, use **`DatabaseTransactions`**.
- **Service Mocking (`[BE-TEST-04]`)**: Use **`$this->mock(PaymentService::class)`** with **`shouldReceive('charge')->once()->with(100)`** to assert interaction. Use `$this->spy()` for loose verification. Never make real network calls. Ban 1:1 pass-through mock echoing.
- **Factories & DB (`[BE-TEST-02]`)**: Create test data via **`Post::factory()->count(3)->create(['user_id' => $id])`**. In **`phpunit.xml`**, set `DB_CONNECTION' value='sqlite'` and `DB_DATABASE' value=':memory:'` for in-memory tests.
- **HTTP Assertions (`[BE-TEST-03]`)**: Chain **`assertStatus(201)`**, **`assertJson(['data' => ...])`**, and `assertJsonStructure`. Avoid shallow assertions.
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Anti-Patterns

- **`[BE-TEST-01]` Stylistic parameterized rewrites**: Do not demand dataset rewrites without a behavioral gap.
- **`[BE-TEST-02]` Brittle DB mock string matching**: Do not match raw SQL strings in mocks; use SQLite in-memory or real DB.
- **`[BE-TEST-03]` Shallow assertions**: Never assert status without verifying payload structures.
- **`[BE-TEST-04]` Pass-through mock echoing**: Ban 1:1 mock echoing without contract assertions.
- **`[BE-TEST-05]` Bug fix without reproduction test**: Ban bug fixes without a reproduction test.
- **No real network calls**: Always mock or stub external services.
- **No state leakage between tests**: Use `RefreshDatabase` trait.
- **No `DB::table()->insert()`**: Never DB::table()->insert() raw data in tests — use Eloquent Factories instead.
## References

- [Testing & Mocking Guide](references/implementation.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- DB_CONNECTION' value='sqlite
- DB_DATABASE' value=':memory
- DatabaseTransactions
- assertJson(['data'
- database rolled back
- never DB::table()->insert()

- Additional task-grounded exact anchors: once()->with(100); assertStatus(201)