---
name: react-tooling
description: 'Debugging, build analysis, and ecosystem tools. Use when debugging React apps, analyzing bundles, or configuring Vite/webpack for React. (triggers: package.json, devtool, bundle, strict mode, profile)'
---

# React Tooling

## **Priority: P2 (OPTIONAL)**

Tools for analysis and debugging.

## Implementation Guidelines

- **Analysis**: Use **`source-map-explorer`** or **`webpack-bundle-analyzer` / `rollup-plugin-visualizer` (Vite)** to inspect bundle size. Use **`react-refresh`** for hot reloading.
- **Linting**: Mandate **`eslint-plugin-react-hooks`** (exhaustive-deps) and **Prettier** for code consistency.
- **StrictMode**: Enable **`React.StrictMode`** to detect **double-invoke lifecycle errors** in development.
- **Profiling**: Use the **React DevTools Profiler** (Flamegraph) to identify expensive components. Enable **"Highlight Updates"** to spot re-renders.
- **Environment**: Use **Vite** as a modern build tool (over CRA). Manage **environment variables** with `.env`.
- **Debugging**: Use **`useDebugValue`** in custom hooks for better DevTools visibility. Use **`logger`** middleware in Redux or **`useWhyDidYouUpdate`** for props.
- **Build**: Configure **Uglify/Terser** for production build minification. Use **`vite-plugin-pwa`** for service worker generation.

## Code

```tsx
// Debugging Hooks
useDebugValue(isOnline ? 'Online' : 'Offline');

// why-did-you-render
if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
  });
}
```

## Anti-Patterns

- **No Production Profiling**: Remove `why-did-you-render` and debug tools before production builds.
- **No Skip StrictMode**: Keep `<React.StrictMode>` in dev to surface side effects early.
