Separate the screen into a container and presentational components. A custom hook or feature service should own API calls, state transitions, and business logic. The screen can call that hook and pass the resulting data, loading/error state, and callbacks into focused presentational components.

Use function components only, TypeScript interfaces for props, and named exports. Keep each component small and single-purpose, define styles with StyleSheet.create, and use composition to avoid prop drilling. Keep feature-specific pieces colocated while moving truly reusable components to a shared components directory.



