# Testing Anti-Patterns

Avoid these common pitfalls to keep tests reliable and maintainable.

## 1. Testing Mock Behavior

**Bad**: Verifying that your mock object was called.
**Good**: Verifying the _outcome_ of the call (state change, return value).

> **Rule**: Test what the code _does_, not what the mocks _do_.

## 2. Test-Only Methods in Production

**Bad**: Adding `forTestingOnly()` methods to your production classes.
**Good**: changing the design to be more testable (e.g., Dependency Injection) or testing the public API.

## 3. Mocking Without Understanding

**Bad**: Mocking a library or dependency without knowing how it actually behaves, leading to "success" in tests but failure in production.
**Good**: Write a small "learning test" against the real dependency first if you are unsure.

## 4. Integration Tests as Afterthought

**Bad**: Writing unit tests for everything but never testing how they fit together until the end.
**Good**: Write integration tests early to verify contracts between components.

## 5. Over-Complex Mocks

**Bad**: Mocks that have their own logic, state engines, or complex setups.
**Good**: If a mock is that complex, you probably need a real object or a fake (lightweight implementation).
