Write unit tests as `XCTestCase` methods whose names start with `test`, use specific assertions, and isolate dependencies with protocols or injected fakes:

```swift
final class UserServiceTests: XCTestCase {
    func testFetchReturnsUser() throws {
        let service = UserService(client: StubClient(user: User(name: "Ava")))

        let user = try service.fetch()

        XCTAssertEqual(user.name, "Ava")
    }
}
```

Use `setUpWithError()` and `tearDownWithError()` for shared environment setup, keep tests focused on behavior, and ensure every test has meaningful assertions. Avoid force unwraps; use `XCTUnwrap` when appropriate.


