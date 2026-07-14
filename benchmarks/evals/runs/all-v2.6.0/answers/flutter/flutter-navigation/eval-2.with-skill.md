Use nested navigation so each tab has its own back stack, and keep the tab container stateful.

With `go_router`, the usual fix is `StatefulShellRoute.indexedStack`. That preserves each tab’s navigation history and lets back behave inside the active tab first instead of exiting immediately.

Expected behavior:
- If the current tab has inner pages, back pops within that tab.
- If you are on a root page of a non-default tab, back can switch to the default tab.
- Only exit when already at the root of the default tab.

Implementation notes:
- Model tabs as branches in a `StatefulShellRoute`.
- Do not manually manage tab state if the router can preserve it.
- If needed, intercept system back on tab root and redirect to the default tab instead of closing the app.

