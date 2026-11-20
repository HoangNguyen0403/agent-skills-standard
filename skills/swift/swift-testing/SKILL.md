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

Universal anti-slop rules (naming, identity fixtures, tautologies, mock echoing, bug-first lock, sleeps, shallow assertions,
coverage): [anti-slop-rules.md](../../common/common-tdd/references/anti-slop-rules.md). Only Swift deltas follow.

## Core Rule Anchors

- **`[MOB-TEST-02]` State Invariant**: Assert state transitions and invariants; ban trivial state mirror tests.
- **`[MOB-TEST-03]` Entity Invariant & Codable**: Test calculations, validations, domain invariants, and non-trivial `Codable`
  parsing or error mapping; ban tests of trivial getters.
- **`[MOB-TEST-04]` Contract Testing**: Repositories and data sources prove contract compliance and error mapping; ban 1:1
  pass-through mock echoing.
- **`[MOB-TEST-06]` Layer & Device Fidelity**: Unit > Snapshot > XCUITest. Mocks and snapshots never substitute native device
  execution; warm resume is not cold relaunch.

## Write XCTest Cases

- **Standard Naming**: Functions prefixed by 'test' (`[MOB-TEST-01]`, e.g. `func test_userLogin_whenValid_isSuccessful()`).
- **Setup/Teardown**: `setUpWithError()` and `tearDownWithError()` for environment management.
- **Assertions**: Use specific ones: `XCTAssertEqual`, `XCTAssertNil`, `XCTAssertTrue`.

See [implementation examples](references/implementation.md) for XCTest setup/teardown, async tests, and UI test patterns.

## Test Async Code

- **Async/Await**: Mark test methods `async throws` and use `try await` directly inside them.
- **Expectations (`GUARD-SWIFT-01`)**: For async callbacks, use `XCTestExpectation`: call `expectation`, `fulfill()`, then
  `wait(for: [exp], timeout: 1.0)` or prefer `await fulfillment(of: [exp], timeout: 2.0)` with timeout $\le 2.0\text{s}$ to
  avoid stalling CI.
- **Timeout**: Always set bounded timeouts $\le 2.0\text{s}$ for unit-test expectations.

## Organize Test Suites

- **Unit Tests**: Use protocols for dependencies and inject them via constructor; isolate logic with mocks/stubs; reuse
  companion test files.
- **UI Tests**: Use `XCUIApplication` and `.accessibilityIdentifier`. For permissions, assert the OS prompt (bounded wait)
  before answering, then assert granted and denied outcomes separately; `addUIInterruptionMonitor` handles interruptions but
  proves nothing on its own, so remove it in teardown. View-tree labels do not prove VoiceOver audio announcements or device
  focus order. Distinguish simulator runs from physical-device performance.
- **Coverage**: Diagnostic and project-configured; verify risk-weighted critical paths.

## Anti-Patterns

- **Skipped/Disabled Tests (`GUARD-UNIV-SKIP`)**: Never commit `@Test(.disabled)` or unconditional `throw XCTSkip`.
- **Excessive Expectation Timeouts (`GUARD-SWIFT-01`)**: Ban unit-test expectation timeouts > 2.0s.
- **No Thread.sleep**: Use expectations or `await`.
- **No force unwrap in tests**: Use `XCTUnwrap()` for better failure messages.
- **No assertion-free tests**: Running code without asserting a contract invariant is not a test.

## References

- [XCTest Patterns & Async Tests](references/implementation.md)
- [Mobile Testing Methodology](../../common/common-mobile-visual-testing/SKILL.md) — 10 mobile scope areas & C6 contract
