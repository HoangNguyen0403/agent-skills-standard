---
name: swift-testing
description: 'Standards for XCTest, Async Tests, and Test Organization. Use when writing XCTest cases, async tests, or organizing test suites in Swift. (triggers: **/*Tests.swift, XCTestCase, XCTestExpectation, XCTAssert)'
---

# Swift Testing Standards

## **Priority: P0**

## Implementation Guidelines

### XCTest Framework

- **Standard Naming**: Test functions must be prefixed by 'test' (e.g., `func testUserLoginSuccessful()`).
- **Setup/Teardown**: Use `setUpWithError()` and `tearDownWithError()` for environment management.
- **Assertions**: Use specific assertions: `XCTAssertEqual`, `XCTAssertNil`, `XCTAssertTrue`, etc.

### Async Testing

- **Async/Await**: Mark test methods as `async throws` and use `try await` directly inside them.
- **Expectations**: Use `XCTestExpectation` for callback-based async logic. Call `expectation` then `fulfill()` when done; then `wait(for: [exp], timeout: 2.0)` to block.
- **Timeout**: Always set reasonable timeouts for expectations to avoid hanging CI.

### Test Organization

- **Unit Tests**: Use protocols for dependencies and Inject them via constructor (e.g., `init(service: ServiceProtocol)`). Focus on logic isolation using mocks/stubs.
- **UI Tests**: Test user flows using `XCUIApplication` and accessibility identifiers.
- **Coverage**: Aim for high coverage on critical business logic and state transitions.

## Anti-Patterns

- **No Thread.sleep**: Use expectations or await.
- **No force unwrap in tests**: Use XCTUnwrap() for better failure messages.
- **No assertion-free tests**: A test that only runs code is not a test.

## References

- [XCTest Patterns & Async Tests](references/implementation.md)
