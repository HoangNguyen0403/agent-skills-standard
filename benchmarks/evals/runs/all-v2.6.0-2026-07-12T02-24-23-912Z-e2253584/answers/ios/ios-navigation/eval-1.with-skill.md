Use `NavigationStack` on iOS 16+ and keep a `NavigationPath` when you need programmatic pushes or deep-link routing. Handle incoming URLs at the root `WindowGroup` with `onOpenURL`, parse them safely with `guard let`, validate that the destination content actually exists, then append the matching route to the path so the back stack stays consistent.

For Universal Links, configure the `applinks` Associated Domains entitlement and route `NSUserActivity` or URL-based entry points into the same navigation coordinator so external entry behaves the same as in-app navigation. If your app has tabs, keep a separate `NavigationStack` per tab instead of sharing one global stack, which avoids broken back behavior when switching tabs.

Avoid force unwrapping while parsing links, avoid appending invalid destinations, and avoid mutating navigation state before prerequisites are loaded. A good pattern is: root router receives URL, validates payload, resolves the target model, switches to the correct tab if needed, then updates that tab’s `NavigationPath`.

