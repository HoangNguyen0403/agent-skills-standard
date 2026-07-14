Here’s a quick-start iOS app lifecycle example for an iOS 13+ app:

```swift
import UIKit
import BackgroundTasks

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    private let bootstrapper = AppBootstrapper()

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        bootstrapper.configureAppServices()
        BackgroundTaskManager.shared.register()
        return true
    }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    private let appCoordinator = AppCoordinator()

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }

        let window = UIWindow(windowScene: windowScene)
        appCoordinator.start(in: window)
        self.window = window
        window.makeKeyAndVisible()

        if let userActivity = connectionOptions.userActivities.first {
            self.scene(scene, continue: userActivity)
        }
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        guard userActivity.activityType == NSUserActivityTypeBrowsingWeb,
              let url = userActivity.webpageURL else { return }
        appCoordinator.handleUniversalLink(url)
    }
}

final class AppBootstrapper {
    func configureAppServices() {
        // analytics, dependency injection, push registration
    }
}

final class AppCoordinator {
    func start(in window: UIWindow) {
        window.rootViewController = UINavigationController(rootViewController: HomeViewController())
    }

    func handleUniversalLink(_ url: URL) {
        // route link into the correct feature flow
    }
}

final class BackgroundTaskManager {
    static let shared = BackgroundTaskManager()
    private let refreshTaskId = "com.example.app.refresh"

    func register() {
        BGTaskScheduler.shared.register(forTaskWithIdentifier: refreshTaskId, using: nil) { task in
            self.handleRefresh(task: task as! BGAppRefreshTask)
        }
    }

    func scheduleRefresh() {
        let request = BGAppRefreshTaskRequest(identifier: refreshTaskId)
        request.earliestBeginDate = Date(timeIntervalSinceNow: 15 * 60)
        try? BGTaskScheduler.shared.submit(request)
    }

    private func handleRefresh(task: BGAppRefreshTask) {
        scheduleRefresh()

        task.expirationHandler = {
            // cancel work before the system terminates the task
        }

        Task {
            await refreshData()
            task.setTaskCompleted(success: true)
        }
    }

    private func refreshData() async {
        // fetch updates in background
    }
}
```

Quick rules:

- Keep `AppDelegate` slim for app-wide setup only.
- Use `SceneDelegate` to create the window on iOS 13+.
- Prefer Universal Links and handle them via `scene(_:continue:)`.
- Use `BGTaskScheduler` for background refresh and always set an `expirationHandler`.
- Avoid blocking launch with synchronous network calls.

