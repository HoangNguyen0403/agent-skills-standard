# Error Handling Implementation

## Custom Error Types

```swift
// ✅ GOOD: Typed errors
enum NetworkError: Error {
    case invalidURL
    case timeout
    case serverError(statusCode: Int)
}

func fetchData(from url: String) throws -> Data {
    guard let url = URL(string: url) else {
        throw NetworkError.invalidURL
    }
    // ...
}
```

## Do-Catch Patterns

```swift
// ✅ GOOD: Specific error handling
do {
    let data = try fetchData(from: urlString)
    process(data)
} catch NetworkError.timeout {
    retryLater()
} catch NetworkError.serverError(let code) {
    log("Server error: \(code)")
} catch {
    log("Unexpected error: \(error)")
}

// ❌ AVOID: Force try
let data = try! fetchData(from: urlString) // Crashes on error
```

## Result Type

```swift
// ✅ GOOD: Result for callbacks
func loadUser(completion: @escaping (Result<User, Error>) -> Void) {
    api.fetch { response in
        if let user = response.user {
            completion(.success(user))
        } else {
            completion(.failure(response.error))
        }
    }
}

// Usage
loadUser { result in
    switch result {
    case .success(let user):
        display(user)
    case .failure(let error):
        handle(error)
    }
}

// Transform
let nameResult = userResult.map { $0.name }
```

## Never Type

```swift
// ✅ GOOD: Never for unreachable code
func fatalConfiguration() -> Never {
    fatalError("Configuration error")
}

// Guards against invalid state
func process(_ value: Int) {
    guard value >= 0 else {
        fatalConfiguration()
    }
    // Compiler knows value >= 0 here
}
```
