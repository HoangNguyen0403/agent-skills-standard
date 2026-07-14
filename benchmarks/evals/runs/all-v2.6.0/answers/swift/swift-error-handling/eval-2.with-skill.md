Define domain-specific errors as an `enum` conforming to `Error`, adding associated values when callers need context:

```swift
enum FileError: Error {
    case missing(URL)
    case unreadable(reason: String)
}

func read(_ url: URL) throws -> Data {
    guard FileManager.default.fileExists(atPath: url.path) else {
        throw FileError.missing(url)
    }
    return try Data(contentsOf: url)
}
```

Mark the operation `throws`, then handle specific cases in `do-catch`. Avoid untyped `Error(message:)`; a typed error hierarchy is easier to inspect, test, and map to user-facing messages.


