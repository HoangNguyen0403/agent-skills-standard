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
    let expectation = XCTestExpectation(description: 'Completion handler called")

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
    XCTAssertTrue(loginTextField.waitForExistence(timeout: 2.0))

    loginTextField.tap()
    loginTextField.typeText("username")

    app.buttons["submit_button"].tap()

    XCTAssertTrue(app.staticTexts["welcome_message"].waitForExistence(timeout: 2.0))
}
```

## Mobile Lifecycle & Interruption Testing (XCUITest)

Assert the **approved** restoration outcome; draft retention and session validity are product decisions, not iOS defaults.

```swift
func testLifecycleBackgroundResume_meetsApprovedOutcome() throws {
    let app = XCUIApplication()
    app.launch()

    let noteField = app.textViews["order-note-input"]
    XCTAssertTrue(noteField.waitForExistence(timeout: 2.0))
    noteField.tap()
    noteField.typeText("Rush delivery")

    XCUIDevice.shared.press(.home)          // warm background, no process kill
    app.activate()

    // Replace with the approved expectation: retained draft OR an intentional
    // reset/blocked state documented by the requirement.
    XCTAssertTrue(noteField.waitForExistence(timeout: 3.0))
    XCTAssertEqual(noteField.value as? String, "Rush delivery")
}

// Same-process only. Activity/controller retention does not prove saved-state
// serialization or process replacement; those need a reconstructed owner and
// external device control (terminate + cold launch).
```

### Permission Interruption — Explicit Precondition and Oracle

Two separate tests: one per path. The **OS** permission state must be established and restored by the runner, not by an application launch flag — an app cannot clear its own protected-resource authorization from inside `launchArguments`, so a custom flag only resets app-owned state (and must then be documented as such).

```swift
final class PermissionFlowUITests: XCTestCase {
    private let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
    private let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        // Version-supported runner reset (iOS 13.4+/Xcode-provided XCUITest):
        // returns the app's protected-resource authorization to "not determined".
        if #available(iOS 13.4, *) {
            app.resetAuthorizationStatus(for: .location)
        } else {
            throw XCTSkip("OS permission reset unavailable; record BLOCKED (device: permission control)")
        }
    }

    override func tearDownWithError() throws {
        app.terminate()
        if #available(iOS 13.4, *) {
            app.resetAuthorizationStatus(for: .location) // restore, even after a failed assertion
        }
    }

    func testLocationPermission_whenGranted_showsApprovedEnabledState() throws {
        app.launch()

        app.buttons["request-location-button"].tap()

        // Assert the OS prompt before answering it.
        let allowButton = springboard.buttons["Allow While Using App"]
        XCTAssertTrue(allowButton.waitForExistence(timeout: 5.0), "OS permission prompt did not appear")
        allowButton.tap()

        XCTAssertTrue(app.staticTexts["location-enabled"].waitForExistence(timeout: 5.0))
    }

    func testLocationPermission_whenDenied_showsApprovedDeniedState() throws {
        app.launch()

        app.buttons["request-location-button"].tap()

        let denyButton = springboard.buttons["Don't Allow"]
        XCTAssertTrue(denyButton.waitForExistence(timeout: 5.0), "OS permission prompt did not appear")
        denyButton.tap()

        // Approved denied-state outcome; substitute the requirement's own affordance.
        XCTAssertTrue(app.staticTexts["location-unavailable"].waitForExistence(timeout: 5.0))
    }
}
```

- `resetAuthorizationStatus(for:)` only covers the protected resources it supports for the installed OS; when it is unavailable (or the device is not under runner control) the dependent cell is `BLOCKED (device: permission control)`.
- Do not replace the OS reset with a denial-first ordering: on iOS a denial persists, so the later allowed test still gets no prompt.
- If the runner cannot observe the prompt at all, record `partial`/`BLOCKED` rather than claiming permission coverage.

## Logout — Local Purge & Session Invalidation

```swift
// Drives the real logout entry point against a stateful identity double that
// actually validates tokens: a revocation *request* is not proof, acceptance of
// the old token afterwards is. Adapter-level only — Keychain enforcement still
// requires a device/instrumented check.
// Synthetic contract for this example: the stateful identity boundary throws
// this error only when it rejects a revoked session token.
private enum RevokedSessionError: Error {
    case revoked
}

final class LogoutTests: XCTestCase {
    func testLogout_purgesLocalToken_andRejectsOldSessionToken() async throws {
        let secureStore = FakeSecureStore()
        let identity = StatefulIdentityBoundary()   // validates + revokes; throws RevokedSessionError for revoked tokens
        let auth = AuthService(secureStore: secureStore, identity: identity)
        try await auth.signIn(identity: SyntheticIdentity(id: "qa-user-1"))

        let oldToken = try XCTUnwrap(secureStore.read("refresh_token"))
        try await identity.validate(oldToken)       // precondition: token is live

        await auth.logout()

        XCTAssertNil(try secureStore.read("refresh_token"))
        do {
            try await identity.validate(oldToken)
            XCTFail("old session token still accepted after logout")
        } catch is RevokedSessionError {
            // expected: the identity boundary rejects the revoked token
        } catch {
            XCTFail("unexpected validation error: \(error)")
        }
    }
}
```

If only a revocation-request dispatch can be observed (no validating identity double), label the case `revocation-request only` and defer invalidation proof to the separate identity-boundary case; do not claim session invalidation from a recorded call.

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
