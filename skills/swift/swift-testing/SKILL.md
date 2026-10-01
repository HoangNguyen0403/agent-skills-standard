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

## **Priority: P0 (CRITICAL)**

## Core Rule Anchors

- **`[MOB-TEST-01]` Tripartite Naming**: Test functions must follow `test_method_scenario_expectedBehavior` or `testMethod_scenario_expectedBehavior`.
- **`[MOB-TEST-02]` State Invariant Rule**: Assert state transitions and invariants; ban trivial state mirror tests.
- **`[MOB-TEST-03]` Entity Invariant & Codable Rule**: Test calculations, validations, domain invariants, and non-trivial `Codable` serialization/parsing or error mapping; ban testing trivial getters or echo tests.
- **`[MOB-TEST-04]` Contract Testing Rule**: Repositories and data sources must be tested for contract compliance and error mapping; ban 1:1 pass-through mock echoing.
- **`[MOB-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.

## Write XCTest Cases

- **Standard Naming**: Test functions must prefixed by 'test' (`[MOB-TEST-01]`, e.g., `func test_userLogin_whenValid_isSuccessful()`).
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
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Anti-Patterns

- **`[MOB-TEST-01..05]` Violations**: Ban vague names, trivial state mirrors, echo tests, 1:1 mock echoing, and unverified bug fixes.
- **No Thread.sleep**: Use expectations or await.
- **No force unwrap in tests**: Use `XCTUnwrap()` for better failure messages.
- **No assertion-free tests**: A test that only runs code without asserting contract invariants is not a test.

## References

- [XCTest Patterns & Async Tests](references/implementation.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Inject them via constructor
- Use protocols
- prefixed by 'test'
