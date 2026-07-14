Mark an XCTest method `async throws` and call the asynchronous API with `try await` directly:

```swift
final class APIClientTests: XCTestCase {
    func testFetchUser() async throws {
        let client = APIClient(transport: StubTransport())

        let user = try await client.fetchUser()

        XCTAssertEqual(user.id, 42)
    }
}
```

Use structured async APIs rather than `Thread.sleep`. If the code is callback-based, bridge or test it with an `XCTestExpectation` and a reasonable timeout.


