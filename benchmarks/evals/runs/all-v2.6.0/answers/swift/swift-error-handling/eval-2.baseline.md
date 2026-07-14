Define a type that conforms to `Error`, usually an `enum` for a finite set of failure cases. Associated values can carry context needed by the caller.

```swift
enum NetworkError: Error {
    case invalidURL
    case httpStatus(Int)
    case decodingFailed(underlying: Error)
}

func request() throws -> Data {
    throw NetworkError.httpStatus(404)
}
```

Throw the cases from `throws` functions and handle them with `do`/`catch`, pattern matching, or by translating them at a layer boundary. Add `LocalizedError` when a user-facing description is appropriate; do not make the error message the only machine-readable information.

