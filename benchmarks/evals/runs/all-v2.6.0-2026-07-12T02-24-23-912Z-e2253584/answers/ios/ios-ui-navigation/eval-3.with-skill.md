Here’s a quick-start UIKit navigation example that follows the iOS UI navigation skill:

```swift
import UIKit

final class HomeViewController: UIViewController {
    private let detailsButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Open Details", for: .normal)
        button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        button.accessibilityLabel = "Open details screen"
        return button
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Home"
        view.backgroundColor = .systemBackground
        navigationItem.largeTitleDisplayMode = .always

        view.addSubview(detailsButton)
        NSLayoutConstraint.activate([
            detailsButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            detailsButton.centerYAnchor.constraint(equalTo: view.safeAreaLayoutGuide.centerYAnchor)
        ])

        detailsButton.addTarget(self, action: #selector(openDetails), for: .touchUpInside)
    }

    @objc private func openDetails() {
        let feedback = UINotificationFeedbackGenerator()
        feedback.notificationOccurred(.success)
        navigationController?.pushViewController(DetailsViewController(), animated: true)
    }
}

final class DetailsViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        title = "Details"
        view.backgroundColor = .secondarySystemBackground
    }
}

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        let rootViewController = UINavigationController(rootViewController: HomeViewController())
        rootViewController.navigationBar.prefersLargeTitles = true
        window.rootViewController = rootViewController
        window.makeKeyAndVisible()
        self.window = window
        return true
    }
}
```

Why this is a solid starting point:

- Uses `UINavigationController` for standard push navigation.
- Uses Auto Layout instead of manual frames.
- Anchors layout to the safe area.
- Supports Dynamic Type with `preferredFont`.
- Adds an `accessibilityLabel`.
- Uses haptic feedback on navigation action.

