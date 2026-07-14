Use an enum with associated values when each case carries different typed data:

```swift
enum LoadState {
    case idle
    case loading
    case success(User)
    case failure(Error)
}

func render(_ state: LoadState) {
    switch state {
    case .idle: show("Idle")
    case .loading: show("Loading")
    case .success(let user): show(user.name)
    case .failure(let error): show(error.localizedDescription)
    }
}
```

This is safer than representing mutually exclusive states with several optionals. Use an exhaustive `switch` and extract associated values in each matching case.


