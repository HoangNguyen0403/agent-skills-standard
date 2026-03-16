---
name: react-tooling
description: "Debugging, build analysis, and ecosystem tools. Use when debugging React apps, analyzing bundles, or configuring Vite/webpack for React. (triggers: package.json, devtool, bundle, strict mode, profile)"
---

# React Tooling

## **Priority: P2 (OPTIONAL)**

Tools for analysis and debugging.

## Implementation Guidelines

- **DevTools**: Use "Highlight Updates" to spot re-renders.
- **Debugger**: `useDebugValue` for custom hooks.
- **Performance**: `why-did-you-render` to catch wasted renders.
- **Bundle**: `source-map-explorer` or `bundle-visualizer`.
- **Linting**: `eslint-plugin-react-hooks` (Errors) + `react-refresh`.
- **Strict Mode**: Enable for double-invoke checks (effects/reducers).

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


## 🚫 Anti-Patterns

- Do NOT use standard patterns if specific project rules exist.
- Do NOT ignore error handling or edge cases.
