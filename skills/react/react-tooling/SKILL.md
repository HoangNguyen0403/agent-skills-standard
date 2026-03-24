---
name: react-tooling
description: "Configure debugging, bundle analysis, and ecosystem tools for React applications. Use when setting up Vite/webpack build tooling, analyzing bundle size, debugging re-renders with React DevTools, or configuring ESLint and StrictMode for React projects. (triggers: package.json, devtool, bundle, strict mode, profile)"
---

# React Tooling

## Priority: P2 (OPTIONAL)

Tools for analysis, debugging, and build optimization.

## Debugging Workflow

1. **Enable StrictMode** to catch side-effect bugs during development.
2. **Profile** with React DevTools Flamegraph to identify expensive components.
3. **Trace re-renders** using "Highlight Updates" or `why-did-you-render`.
4. **Analyze bundle** with `source-map-explorer` or `rollup-plugin-visualizer` before shipping.

## Setup

```tsx
// index.tsx — StrictMode + why-did-you-render setup
import React from 'react';
import ReactDOM from 'react-dom/client';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, { trackAllPureComponents: true });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>
);
```

```tsx
// Custom hook with debug label for DevTools
function useOnlineStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot);
  useDebugValue(isOnline ? 'Online' : 'Offline');
  return isOnline;
}
```

## Implementation Guidelines

- **Analysis**: Use `source-map-explorer` or `webpack-bundle-analyzer` / `rollup-plugin-visualizer` (Vite).
- **Linting**: Mandate `eslint-plugin-react-hooks` (exhaustive-deps) and Prettier.
- **Environment**: Use Vite over CRA. Manage environment variables with `.env`.
- **Build**: Configure Terser for production minification. Use `vite-plugin-pwa` for service workers.

## Anti-Patterns

- **No production profiling**: Remove `why-did-you-render` and debug tools before production builds.
- **No skipping StrictMode**: Keep `<React.StrictMode>` in dev to surface side effects early.
- **No CRA for new projects**: Use Vite for faster builds and better DX.
