Common iOS navigation anti-patterns to avoid:

- Force-unwrapping URL parts or route data instead of validating with `guard let`.
- Corrupting the back stack by pushing destinations when the current navigation state is invalid.
- Navigating from deep links before checking the target content actually exists.
- Mixing ad-hoc navigation state instead of using a consistent `NavigationStack` and `NavigationPath` flow.
- Handling deep links too low in the view tree instead of at the root with `onOpenURL`.
- Sharing one navigation stack across tabs instead of keeping separate stacks per tab.

