Use `SceneDelegate` as the main entry point for UI lifecycle on iOS 13+, and keep `AppDelegate` focused on app-wide setup only.

- In `SceneDelegate`, create the `UIWindow`, attach it to the `UIWindowScene`, and start your root coordinator there.
- In `AppDelegate`, keep `application(_:didFinishLaunchingWithOptions:)` slim by delegating dependency registration, analytics setup, and push registration to a dedicated `AppBootstrapper`.
- For deep links, prefer Universal Links and handle them through `scene(_:continue:userActivity:)`, then route into your coordinator instead of putting navigation logic directly in the delegate.
- For background work, use `BGTaskScheduler`, register tasks once at launch, and always set an `expirationHandler` so the system can safely stop unfinished work.
- Avoid synchronous network calls during launch, heavy logic in `AppDelegate`, or manually managing the main window from `AppDelegate` on modern iOS.

Example structure:

```swift
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        AppBootstrapper().configure()
        registerBackgroundTasks()
        return true
    }
}

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    var appCoordinator: AppCoordinator?

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        guard let windowScene = scene as? UIWindowScene else { return }
        let window = UIWindow(windowScene: windowScene)
        let nav = UINavigationController()
        let coordinator = AppCoordinator(nav: nav)
        coordinator.start()

        window.rootViewController = nav
        self.window = window
        self.appCoordinator = coordinator
        window.makeKeyAndVisible()
    }
}
```

