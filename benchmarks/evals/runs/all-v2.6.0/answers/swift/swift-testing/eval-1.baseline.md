Create an `XCTestCase` subclass in a test target, add methods whose names begin with `test`, and assert the expected behavior.

```swift
final class CalculatorTests: XCTestCase {
    func testAdd_returnsTheSum() {
        let calculator = Calculator()
        XCTAssertEqual(calculator.add(2, 3), 5)
    }
}
```

Import the module under test with `@testable import ModuleName` when internal APIs must be tested, ensure the source is a member of the test target, and run tests with Xcode or `swift test` for a Swift package. Keep tests deterministic, focused on observable behavior, and independent from network, time, and global state where possible.

