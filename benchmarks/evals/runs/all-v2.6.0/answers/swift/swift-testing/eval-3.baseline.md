Use `XCTestExpectation` when code completes through a callback, notification, delegate, or other asynchronous event.

```swift
func testRefreshCallsCompletion() {
    let expectation = expectation(description: "refresh completes")

    service.refresh {
        expectation.fulfill()
    }

    wait(for: [expectation], timeout: 1.0)
}
```

Fulfill each expectation the expected number of times, wait with a finite timeout, and assert the callback's result as well as its arrival. Use `isInverted = true` when the event must not occur. Prefer direct `async`/`await` tests for APIs that already support structured concurrency.

