Create an expectation before starting callback-based work, fulfill it in the completion handler, then wait with a finite timeout:

```swift
func testCompletionIsCalled() {
    let expectation = expectation(description: "completion called")

    client.fetch { result in
        XCTAssertEqual(try? result.get().id, 42)
        expectation.fulfill()
    }

    wait(for: [expectation], timeout: 2.0)
}
```

Use `async throws` tests with `try await` for async APIs instead of blocking. Every expectation needs a reasonable timeout so a broken callback cannot hang CI.


