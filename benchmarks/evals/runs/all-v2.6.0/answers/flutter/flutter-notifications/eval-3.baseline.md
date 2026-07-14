You should delay the notification permission request until after the user understands why it’s needed. Right now it sounds like the app asks on first launch, which feels abrupt and can hurt opt-in rates.

A better approach is:

- Do not show the system popup immediately on app open
- First show a short in-app explanation screen or banner
- Ask only when the user reaches a feature that depends on notifications
- If they decline, let them continue and offer a way to enable notifications later in Settings

In Flutter, the fix is usually to remove any permission request from startup logic like `main()`, initial splash flow, or first-screen `initState()`, and trigger it later from a user action or contextual moment instead.

