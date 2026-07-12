Define asynchronous work with `async` and suspend at calls with `await`:

```swift
enum NetworkError: Error { case invalidResponse }

func loadUser() async throws -> User {
    let (data, response) = try await URLSession.shared.data(from: userURL)
    guard let http = response as? HTTPURLResponse,
          (200..<300).contains(http.statusCode) else {
        throw NetworkError.invalidResponse
    }
    return try JSONDecoder().decode(User.self, from: data)
}

Task {
    do {
        let user = try await loadUser()
        // Update state on the appropriate actor.
        print(user)
    } catch is CancellationError {
        // Treat cancellation as an expected outcome.
    } catch {
        print(error)
    }
}
```

Use structured tasks such as `Task`, `async let`, or task groups, and propagate cancellation with `Task.isCancelled` or `try Task.checkCancellation()` in long-running work.


