# iOS Dependency Injection Implementation

## Manual Initializer Injection

```swift
protocol AnalyticsServiceProtocol {
    func logEvent(name: String)
}

class HomeViewModel {
    private let analytics: AnalyticsServiceProtocol

    // POSITIVE: Clear, testable dependency
    init(analytics: AnalyticsServiceProtocol) {
        self.analytics = analytics
    }
}
```

## Modern DI with Factory

```swift
import Factory

// 1. Definition
extension Container {
    var analyticsService: Factory<AnalyticsServiceProtocol> {
        self { AnalyticsService() }.singleton
    }

    var homeViewModel: Factory<HomeViewModel> {
        self { HomeViewModel(analytics: self.analyticsService()) }
    }
}

// 2. Usage
class HomeViewController: UIViewController {
    @Injected(\.homeViewModel) private var viewModel
}
```

## Testing with Mocks

```swift
class MockAnalytics: AnalyticsServiceProtocol {
    var logCount = 0
    func logEvent(name: String) {
        logCount += 1
    }
}

func testViewModel() {
    let mock = MockAnalytics()
    let vm = HomeViewModel(analytics: mock)
    // Assert...
}
```
