A quick-start example for the iOS app lifecycle:

1. The system launches your app and calls `application(_:didFinishLaunchingWithOptions:)` in `AppDelegate`.
2. If you use scenes, iOS then creates a scene session and calls `scene(_:willConnectTo:options:)` in `SceneDelegate`.
3. When the app becomes active, `applicationDidBecomeActive(_:)` or `sceneDidBecomeActive(_:)` runs.
4. If the user backgrounds the app, iOS calls `applicationWillResignActive(_:)`, then `applicationDidEnterBackground(_:)`.
5. When returning to foreground, iOS calls `applicationWillEnterForeground(_:)`, then `applicationDidBecomeActive(_:)`.
6. When the app is terminated, `applicationWillTerminate(_:)` may be called.

Example:

```swift
import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        print("App did finish launching")
        return true
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        print("App became active")
    }

    func applicationWillResignActive(_ application: UIApplication) {
        print("App will resign active")
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        print("App entered background")
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        print("App will enter foreground")
    }

    func applicationWillTerminate(_ application: UIApplication) {
        print("App will terminate")
    }
}
```

In modern multi-window apps, some lifecycle events move to `SceneDelegate`, but the overall pattern is: launch, active, inactive, background, foreground, terminate.

