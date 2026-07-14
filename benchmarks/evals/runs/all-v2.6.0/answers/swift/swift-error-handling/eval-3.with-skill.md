Use `throws` for normal synchronous or `async throws` APIs where the caller can handle failure immediately through `do-catch`:

```swift
func load() throws -> Model { ... }

do {
    let model = try load()
} catch {
    handle(error)
}
```

Use `Result<Success, Failure>` for callback-based APIs, stored/deferred outcomes, or functional transformations with `.map()` and `.flatMap()`:

```swift
func load(completion: (Result<Model, Error>) -> Void) { ... }
```

Call `.get()` to convert a `Result` back into a throwing flow. Do not use `Result` merely to replace ordinary `throws` in synchronous code.


