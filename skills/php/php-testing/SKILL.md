---
name: php-testing
description: Write unit and integration tests for PHP applications with PHPUnit and Pest. Use when writing PHPUnit unit tests or integration tests for PHP applications.
metadata:
  triggers:
    files:
    - 'tests/**/*.php'
    - 'phpunit.xml'
    keywords:
    - phpunit
    - pest
    - mock
    - assert
    - tdd
---
# PHP Testing

## **Priority: P1 (HIGH)**

## Structure

See [implementation examples](references/implementation.md#directory-structure) for test directory layout.

## Write Tests with PHPUnit and Pest

- **Standards**: Use **`PHPUnit`** (9/10+) or **`Pest`**. Organize into **`Unit/`**, **`Integration/`**, and **`Feature/`**. Class names should extend **`TestCase`**.
- **TDD Workflow**: Follow **Red-Green-Refactor**. Write failing test first, implement minimal logic, then refactor.

See [implementation examples](references/implementation.md#phpunit-service-test) for PHPUnit service test with mock.

## Apply Assertions and Data Providers

- **Fluent Assertions**: Use **`assertSame`** (`===`) over `assertEquals` to avoid type coercion. Also use **`assertCount()`** and **`assertMatchesRegularExpression()`**.
- **Data Providers**: Use **`#[DataProvider('statusProvider')]`** (PHPUnit 10+) or **`dataset`** (Pest).

See [implementation examples](references/implementation.md#pest-dataset-example) for Pest expressive syntax with datasets.

## Isolate Test Dependencies

- **Mocking**: Use **`createMock()`** for dependencies. NOT mock simple Data Objects.
- **Isolation**: Ensure tests **Independent** and **Repeatable**. DB tests must use **`Transactions`** or **`SQLite :memory:`**.
- **Coverage**: Aim for **`80%+`** line coverage. Use **`phpunit.xml`** to whitelist specific directories.
- **Automation**: Run tests on every PR using **GitHub Actions** or **GitLab CI**.

## Anti-Patterns

- **No testing private methods**: Test through public interfaces only.
- **No over-mocking internals**: Mock only external boundaries.
- **No real network/DB in unit tests**: Use in-memory databases or mocks.
- **No coverage-metric chasing**: Prioritize meaningful assertions.

## References

- [Testing Patterns & Mocks](references/implementation.md)