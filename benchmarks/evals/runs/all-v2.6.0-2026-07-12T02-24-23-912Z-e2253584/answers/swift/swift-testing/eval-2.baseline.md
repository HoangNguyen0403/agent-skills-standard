Declare an XCTest method as `async` and optionally `throws`, then await the asynchronous operation directly:

```swift
final class UserTests: XCTestCase {
    func testLoadUser() async throws {
        let service = UserService(client: FakeClient())
        let user = try await service.loadUser()
        XCTAssertEqual(user.name, "Ada")
    }
}
```

For callback-based APIs, bridge or test them with an `XCTestExpectation`; in modern XCTest async tests, use `await fulfillment(of:timeout:enforceOrder:)` where available. Keep timeouts bounded and assert errors explicitly. An async test runs under XCTest's concurrency support, so do not block it with arbitrary sleeps.

