Use the iOS app lifecycle to manage setup, UI state, and background work cleanly.

- Keep app-wide startup in the app entry point or app delegate, such as dependency setup, analytics init, push registration, and global configuration.
- Use scene lifecycle hooks for UI-specific behavior, especially on multi-window apps. Restore UI state when a scene becomes active and save lightweight state when it resigns active.
- Treat foreground and background transitions explicitly:
  - Refresh time-sensitive data when entering foreground.
  - Pause timers, animations, camera, and nonessential work when moving to background.
  - Persist unsaved user data before suspension.
- Do not overload launch with heavy work. Defer expensive tasks until after the first screen is shown.
- Make state restoration predictable:
  - Save navigation and draft state when the app is interrupted.
  - Rehydrate only what is needed for a smooth return.
- Handle termination as a best-effort path, not the primary save point, because iOS may suspend or kill the app without giving much time.
- Respect lifecycle-driven resource management:
  - Start observers only when needed.
  - Remove observers, stop tasks, and release memory-heavy objects when inactive or backgrounded.
- For networking:
  - Cancel or pause unnecessary requests when the app becomes inactive.
  - Use background-capable APIs only for work that truly must continue.
- For SwiftUI, use `scenePhase` to react to `.active`, `.inactive`, and `.background` instead of pushing all logic into view code.
- Keep lifecycle handlers thin. Route real business behavior into services so lifecycle code stays easy to test and reason about.

Good rule of thumb: app lifecycle manages app-level coordination, scene lifecycle manages UI session state, and feature logic stays in dedicated services or view models.

