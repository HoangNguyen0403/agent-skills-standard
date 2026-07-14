Depend on a protocol and inject a stub or mock through the initializer:

```swift
protocol UserStore {
    func user() throws -> User
}

final class StubUserStore: UserStore {
    let value: User
    init(value: User) { self.value = value }
    func user() throws -> User { value }
}

final class ProfileViewModel {
    private let store: UserStore
    init(store: UserStore) { self.store = store }
}
```

Tests can now supply deterministic success and failure stores without networking or global state. Keep mocks focused on behavior the test needs and assert the resulting state or interaction.


