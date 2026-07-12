# Expo Router vs React Navigation

Expo Router is built on React Navigation, so the choice is mostly about the navigation authoring model. Choose Expo Router when the app uses Expo, benefits from file-based routing, deep-link/URL conventions, route groups, layouts, and easy web support. It also gives a conventional project structure and works well with Expo tooling.

Choose direct React Navigation when you want navigators declared explicitly in code, need a highly customized navigation tree, are maintaining a bare/native-heavy app, or already have an established React Navigation architecture. It offers the same underlying navigation primitives without requiring file-based routes.

Both can provide typed routes, nested stacks/tabs, deep links, and native-stack behavior. Check package/version compatibility with the chosen React Native or Expo SDK, and prototype the hardest requirements—authentication flows, deep links, state restoration, and native integrations—before committing. Do not mix both routing abstractions unnecessarily; if using Expo Router, use its APIs consistently while treating React Navigation primitives as the underlying implementation.

