---
name: swift-testing
description: Write XCTest cases, async tests, and organized test suites in Swift. Use when writing XCTest cases, async tests, or organizing test suites in Swift.
metadata:
  triggers:
    files:
    - '**/*Tests.swift'
    keywords:
    - XCTestCase
    - XCTestExpectation
    - XCTAssert
---
# Swift Testing Standards

## **Priority: P0**

## Write XCTest Cases

- **Standard Naming**: Test functions must prefixed by 'test' (e.g., `func testUserLoginSuccessful()`).
- **Setup/Teardown**: Use `setUpWithError()` and `tearDownWithError()` for environment management.
- **Assertions**: Use specific assertions: `XCTAssertEqual`, `XCTAssertNil`, `XCTAssertTrue`, etc.

See [implementation examples](references/implementation.md) for XCTest setup/teardown, async tests, and UI test patterns.

## Test Async Code

- **Async/Await**: Mark test methods as `async throws` and use `try await` directly inside them.
- **Expectations**: Use `XCTestExpectation` for callback-based async logic. Call `expectation` then `fulfill()` when done; then `wait(for: [exp], timeout: 2.0)` to block.
- **Timeout**: Always set reasonable timeouts for expectations to avoid hanging CI.

## Organize Test Suites

- **Unit Tests**: Use protocols for dependencies and inject them via constructor (e.g., `init(service: ServiceProtocol)`). Focus on logic isolation using mocks/stubs.
- **UI Tests**: Test user flows using `XCUIApplication` and accessibility identifiers.
- **Coverage**: Aim for high coverage on critical business logic and state transitions.

## Anti-Patterns

- **No Thread.sleep**: Use expectations or await.
- **No force unwrap in tests**: Use XCTUnwrap() for better failure messages.
- **No assertion-free tests**: test that only runs code not test.

## References

- [XCTest Patterns & Async Tests](references/implementation.md)