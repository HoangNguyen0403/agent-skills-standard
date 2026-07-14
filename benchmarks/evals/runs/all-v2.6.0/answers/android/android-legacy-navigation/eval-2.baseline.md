For most large XML-based apps, use one primary `NavHostFragment` and organize its destinations into nested navigation graphs. A nested graph is a logical/module boundary; it does not require another host.

For example, keep separate graphs for authentication, checkout, and the main app, then include them from the root graph. Navigate between destinations through the `NavController`. This centralizes the back stack, deep links, transitions, arguments, and state restoration while keeping each feature graph manageable.

Use multiple `NavHostFragment`s only when there are genuinely independent navigation stacks, such as bottom-navigation tabs that must each preserve their own back stack, a master/detail or two-pane layout, or an independently embedded feature. Multiple hosts add complexity: each has its own controller and back stack, and you must explicitly coordinate which host handles deep links, back presses, and shared app-level navigation.

So the usual choice is:

- scale and modularity: nested graphs, generally under one host;
- independent stacks or simultaneous panes: multiple hosts, only where the UI requires them.

Do not create a host per screen or merely because the navigation graph is large.

