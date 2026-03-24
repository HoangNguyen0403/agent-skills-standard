---
name: swift-testing
description: "Write XCTest cases, async tests, and organized test suites in Swift. Use when writing XCTest cases, async tests, or organizing test suites in Swift. (triggers: **/*Tests.swift, XCTestCase, XCTestExpectation, XCTAssert)"
---

# Swift Testing Standards

## **Priority: P0**

## Write XCTest Cases

- **Standard Naming**: Test functions must be prefixed by 'test' (e.g., `func testUserLoginSuccessful()`).
- **Setup/Teardown**: Use `setUpWithError()` and `tearDownWithError()` for environment management.
- **Assertions**: Use specific assertions: `XCTAssertEqual`, `XCTAssertNil`, `XCTAssertTrue`, etc.

```swift
final class OrderServiceTests: XCTestCase {
    private var sut: OrderService!
    private var mockRepo: MockOrderRepository!

    override func setUpWithError() throws {
        mockRepo = MockOrderRepository()
        sut = OrderService(repository: mockRepo)
    }

    func testCreateOrderReturnsCorrectTotal() throws {
        let order = try sut.createOrder(items: [.init(name: "Widget", price: 9.99, qty: 3)])
        XCTAssertEqual(order.total, 29.97, accuracy: 0.01)
        XCTAssertEqual(mockRepo.savedOrders.count, 1)
    }

    func testFetchOrderAsync() async throws {
        mockRepo.stubbedOrder = Order(id: "abc", total: 42.0)
        let order = try await sut.fetchOrder(id: "abc")
        XCTAssertEqual(order.total, 42.0)
    }
}
```

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
- **No assertion-free tests**: A test that only runs code is not a test.

## References

- [XCTest Patterns & Async Tests](references/implementation.md)
