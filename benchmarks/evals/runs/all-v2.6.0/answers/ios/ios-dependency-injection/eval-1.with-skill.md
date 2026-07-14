Use protocol-based initializer injection as the default.

Best-practice shape:

- Define protocols for dependencies, not concrete classes.
- Inject them through `init(...)` so the dependency graph is explicit and easy to test.
- Avoid resolving dependencies inside business logic or view models.
- Avoid global singletons unless the lifetime is truly app-wide and intentionally scoped.

Example:

```swift
protocol AnalyticsServiceProtocol {
    func logEvent(name: String)
}

final class HomeViewModel {
    private let analytics: AnalyticsServiceProtocol

    init(analytics: AnalyticsServiceProtocol) {
        self.analytics = analytics
    }
}
```

If your project uses a DI container:

- Prefer `Factory` for lightweight, modern Swift DI.
- Use `Swinject` when you need a larger container-driven setup.
- Keep registration in one composition root.
- Use singleton scope for app-wide services like networking/auth.
- Use transient/unique scope for view models and short-lived feature objects.

Factory-style example:

```swift
import Factory

extension Container {
    var analyticsService: Factory<AnalyticsServiceProtocol> {
        self { AnalyticsService() }.singleton
    }

    var homeViewModel: Factory<HomeViewModel> {
        self { HomeViewModel(analytics: self.analyticsService()) }
    }
}
```

And in UI code:

```swift
final class HomeViewController: UIViewController {
    @Injected(\.homeViewModel) private var viewModel
}
```

For tests, inject mocks directly:

```swift
final class MockAnalytics: AnalyticsServiceProtocol {
    var logCount = 0
    func logEvent(name: String) { logCount += 1 }
}
```

In short: initializer injection first, protocols everywhere, container only at the composition boundary, and lifetimes scoped intentionally.

