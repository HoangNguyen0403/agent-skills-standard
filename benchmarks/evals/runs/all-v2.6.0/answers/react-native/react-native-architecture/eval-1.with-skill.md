Use a feature-first structure as the app grows:

- Put each feature's screens, components, hooks, services, and tests together.
- Keep cross-feature primitives in shared components and shared utilities.
- Keep UI separate from business logic and data access.
- Use absolute TypeScript imports and keep nesting to about three levels.

Avoid root folders organized only by type, such as screens or containers. Each file should have one responsibility, and features should not import one another directly. Choose a navigation strategy explicitly: Expo Router is the default for new Expo projects and web parity; React Navigation remains a good fit for legacy apps, complex deep linking, or highly customized navigation.



