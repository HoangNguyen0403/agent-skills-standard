# Swift Testing Implementation

## Standard Unit Test

```swift
import XCTest
@testable import MyModule

final class UserServiceTests: XCTestCase {
    var sut: UserService!
    var mockRepository: MockUserRepository!

    override func setUpWithError() throws {
        mockRepository = MockUserRepository()
        sut = UserService(repository: mockRepository)
    }

    override func tearDownWithError() throws {
        sut = nil
        mockRepository = nil
    }

    func testFetchUser_Success() async throws {
        // Given
        let expectedUser = User(id: "1", name: "Test")
        mockRepository.stubbedUser = expectedUser

        // When
        let user = try await sut.fetchUser(id: "1")

        // Then
        XCTAssertEqual(user.id, "1")
        XCTAssertEqual(user.name, "Test")
    }
}
```

## Async Expectations (Legacy Support)

```swift
func testCompletionHandlerAsync() {
    let expectation = XCTestExpectation(description: "Completion handler called")

    sut.doAsyncWork { result in
        XCTAssertTrue(result)
        expectation.fulfill()
    }

    wait(for: [expectation], timeout: 2.0)
}
```

## UI Testing Basics

```swift
func testLoginFlow() throws {
    let app = XCUIApplication()
    app.launch()

    let loginTextField = app.textFields["login_field"]
    XCTAssertTrue(loginTextField.exists)

    loginTextField.tap()
    loginTextField.typeText("username")

    app.buttons["submit_button"].tap()

    XCTAssertTrue(app.staticTexts["welcome_message"].exists)
}
```

## Order Service Test with Async

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
