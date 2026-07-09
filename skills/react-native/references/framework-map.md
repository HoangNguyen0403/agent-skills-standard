# React Native Framework Map

Reviewed: 2026-07-09

Official sources:
- https://reactnative.dev/docs/getting-started
- https://reactnavigation.org/docs/getting-started
- https://docs.expo.dev/router/introduction/
- https://docs.expo.dev

Notes:
- Expo Router is the default for new Expo projects; React Navigation is used directly for bare/CLI projects, legacy apps, or navigation needs Expo Router doesn't cover yet.

## Default stance

- `react-native-architecture`: feature-first structure, navigation-strategy choice (base language skill).
- `react-native-navigation-v6`: stack/tab/drawer setup, typed params, auth-flow structure (when using React Navigation directly).
- `react-native-navigation`: deep-linking/universal-links configuration companion to `react-native-navigation-v6`.
- `react-native-state-management`: local vs global vs server state selection.
- `react-native-security`: secure storage, certificate pinning.
- `react-native-testing`: RNTL conventions.

## Navigation selection

- New Expo project → Expo Router (file-based routing); consult `react-native-architecture` for structure, `react-native-navigation`/`react-native-navigation-v6` only for the deep-linking/typed-param concepts that still apply.
- Bare RN / CLI project, legacy app, or high-customization navigation → React Navigation directly via `react-native-navigation-v6`.
- Do not introduce a second navigation library into a project that already committed to one.

## Smells that mean "load more skills"

- A new Expo project hand-rolls `NavigationContainer` instead of using Expo Router.
- Deep-link params are parsed manually instead of through `linking.config`/Expo Router file conventions.
- Screens hold business logic instead of delegating to hooks/services (`react-native-architecture`).
- Global state is duplicated between a store (Zustand/RTK) and component `useState`.
