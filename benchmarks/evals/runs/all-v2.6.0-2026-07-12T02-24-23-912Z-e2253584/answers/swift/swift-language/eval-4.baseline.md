An enum case with associated values stores extra data specific to that case. Pattern-match it with `switch`, `if case`, or `guard case`.

```swift
enum LoadState {
    case idle
    case loading
    case loaded([User])
    case failed(Error)
}

func describe(_ state: LoadState) -> String {
    switch state {
    case .idle: return "Not started"
    case .loading: return "Loading"
    case .loaded(let users): return "Loaded \(users.count) users"
    case .failed(let error): return "Failed: \(error)"
    }
}
```

Switches must be exhaustive unless a `default` is appropriate. Associated values are different from raw values: they can vary per instance and have arbitrary types.

