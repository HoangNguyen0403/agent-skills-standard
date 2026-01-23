# iOS App Lifecycle Implementation

## Clean SceneDelegate Setup

```swift
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    var appCoordinator: AppCoordinator?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }

        let window = UIWindow(windowScene: windowScene)
        let rootNav = UINavigationController()

        appCoordinator = AppCoordinator(nav: rootNav)
        appCoordinator?.start()

        window.rootViewController = rootNav
        self.window = window
        window.makeKeyAndVisible()
    }
}
```

## Background Task Registration

```swift
import BackgroundTasks

func registerBackgroundTasks() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: "com.app.refresh", using: nil) { task in
        self.handleAppRefresh(task: task as! BGAppRefreshTask)
    }
}

func handleAppRefresh(task: BGAppRefreshTask) {
    task.expirationHandler = {
        // Stop work
    }

    // Perform work
    fetchData { success in
        task.setTaskCompleted(success: success)
    }
}
```
