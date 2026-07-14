Here’s a simple quick-start using protocol-based initializer injection first, then Factory for wiring:

```swift
import UIKit
import Factory

protocol AnalyticsServiceProtocol {
    func logEvent(name: String)
}

final class AnalyticsService: AnalyticsServiceProtocol {
    func logEvent(name: String) {
        print("Logged: \(name)")
    }
}

final class HomeViewModel {
    private let analytics: AnalyticsServiceProtocol

    init(analytics: AnalyticsServiceProtocol) {
        self.analytics = analytics
    }

    func screenOpened() {
        analytics.logEvent(name: "home_opened")
    }
}

extension Container {
    var analyticsService: Factory<AnalyticsServiceProtocol> {
        self { AnalyticsService() }.singleton
    }

    var homeViewModel: Factory<HomeViewModel> {
        self { HomeViewModel(analytics: self.analyticsService()) }
    }
}

final class HomeViewController: UIViewController {
    @Injected(\.homeViewModel) private var viewModel

    override func viewDidLoad() {
        super.viewDidLoad()
        viewModel.screenOpened()
    }
}
```

Why this setup:

- Use initializer injection as the default.
- Depend on protocols, not concrete classes.
- Keep singleton scope for app-wide services like analytics.
- Avoid resolving dependencies inline inside business logic.

