---
name: ios-app-lifecycle
description: Configure AppDelegate, SceneDelegate, deep linking, and background tasks. Use when configuring iOS app lifecycle, deep linking, or background task scheduling.
metadata:
  triggers:
    files:
    - 'AppDelegate.swift'
    - 'SceneDelegate.swift'
    keywords:
    - didFinishLaunchingWithOptions
    - willConnectTo
    - backgroundTask
    - Shortcut
    - UserActivity
---
# iOS App Lifecycle

## **Priority: P0**

## Implementation Workflow

1. **Configure SceneDelegate** — Use for UI windows and scene-specific state in iOS 13+.
2. **Keep AppDelegate slim** — Focus on app-wide setup (DI, Analytics, Push registration). Move initialization logic to dedicated `Bootstrapper` or `AppCoordinator`.
3. **Handle deep links** — Prefer Universal Links over custom URL schemes. Handle via `scene(_:continue:userActivity:)`. Route through Root Coordinator.
4. **Schedule background tasks** — Use `BGTaskScheduler` for periodic data refresh. Always handle `expirationHandler` to avoid system kill.

See [bootstrapper pattern and background task examples](references/implementation.md)

## Anti-Patterns

- **No Complex AppDelegate Logic**: Delegate to Bootstrapper service
- **No Manual AppDelegate UIWindow**: Use SceneDelegate for iOS 13+
- **No Sync Launch Network**: Move all launch calls to background threads

## References

- [Lifecycle & Background Tasks](references/implementation.md)