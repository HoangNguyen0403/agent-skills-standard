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
    - ios ui test
---
# Swift Testing Standards

## **Priority: P0 (CRITICAL)**

## Core Rule Anchors

- **`[MOB-TEST-01]` Tripartite Naming**: Test functions must follow `test_method_scenario_expectedBehavior` or `testMethod_scenario_expectedBehavior`.
- **`[MOB-TEST-02]` State Invariant Rule**: Assert state transitions and invariants; ban trivial state mirror tests.
- **`[MOB-TEST-03]` Entity Invariant & Codable Rule**: Test calculations, validations, domain invariants, and non-trivial `Codable` serialization/parsing or error mapping; ban testing trivial getters or echo tests. Check companion files before creating new test files.
- **`[MOB-TEST-04]` Contract Testing Rule**: Repositories and data sources must be tested for contract compliance and error mapping; ban 1:1 pass-through mock echoing.
- **`[MOB-TEST-05]` Bug-First Regression Lock**: Every PR fixing a bug ticket or with title `fix(...)` must introduce a test reproducing the defect prior to the fix.
- **`[MOB-TEST-06]` Layer & Device Fidelity**: Select appropriate layer (Unit > Snapshot > XCUITest). Mocks/snapshots never substitute native device execution. Warm resume is not cold relaunch.
## Write XCTest Cases

- **Standard Naming**: Test functions must be prefixed by 'test' (`[MOB-TEST-01]`, e.g., `func test_userLogin_whenValid_isSuccessful()`).
- **Setup/Teardown**: Use `setUpWithError()` and `tearDownWithError()` for environment management.
- **Assertions**: Use specific assertions: `XCTAssertEqual`, `XCTAssertNil`, `XCTAssertTrue`, etc.

See [implementation examples](references/implementation.md) for XCTest setup/teardown, async tests, and UI test patterns.

## Test Async Code

- **Async/Await**: Mark test methods as `async throws` and use `try await` directly inside them.
- **Expectations (`GUARD-SWIFT-01`)**: For async callbacks, use `XCTestExpectation`: call `expectation`, `fulfill()`, then `wait(for: [exp], timeout: 2.0)` or prefer modern `await fulfillment(of: [exp], timeout: 2.0)` with timeout $\le 2.0\text{s}$ to avoid stalling CI.
- **Timeout**: Always set bounded timeouts $\le 2.0\text{s}$ for unit test expectations.

## Organize Test Suites

- **Unit Tests**: Use protocols for dependencies and inject them via constructor. Focus on logic isolation using mocks/stubs. Check companion test files before creating new ones.
- **UI Tests**: Test user flows using `XCUIApplication` and `.accessibilityIdentifier`. For permissions, assert the OS prompt (bounded wait) before answering it and assert approved granted/denied outcome; `addUIInterruptionMonitor` handles interruptions but proves nothing on its own, so remove it in teardown. View tree labels do not prove VoiceOver audio announcements or device focus order. Distinguish simulator tests from physical device performance.
- **Coverage**: Coverage is diagnostic and project-configured; verify risk-weighted critical paths rather than padding code for an arbitrary percentage.

## Anti-Patterns

- **`[MOB-TEST-01..05]` Violations**: Ban vague names, trivial state mirrors, echo tests, 1:1 mock echoing, and unverified bug fixes.
- **Ban Skipped/Disabled Tests (`GUARD-UNIV-SKIP`)**: Never commit `@Test(.disabled)` or unconditional `throw XCTSkip`.
- **Excessive Expectation Timeouts (`GUARD-SWIFT-01`)**: Ban expectation timeouts > 2.0s in unit tests.
- **No Thread.sleep**: Use expectations or await.
- **No force unwrap in tests**: Use `XCTUnwrap()` for better failure messages.
- **No assertion-free tests**: A test that only runs code without asserting contract invariants is not a test.

## References

- [XCTest Patterns & Async Tests](references/implementation.md)
- [Mobile Testing Methodology](../../common/common-mobile-visual-testing/SKILL.md) — 10 mobile scope areas & C6 contract
