---
name: react-tooling
description: Configure debugging, bundle analysis, and ecosystem tools for React applications. Use when setting up Vite/webpack build tooling, analyzing bundle size, debugging re-renders with React DevTools, or configuring ESLint and StrictMode for React projects.
metadata:
  triggers:
    files:
    - 'package.json'
    keywords:
    - devtool
    - bundle
    - strict mode
    - profile
---
# React Tooling

## **Priority: P2 (OPTIONAL)**

## Debugging Workflow

1. **Enable StrictMode** to catch side-effect bugs during development.
2. **Profile** with React DevTools Flamegraph to identify expensive components.
3. **Trace re-renders** using "Highlight Updates" or `why-did-you-render`.
4. **Analyze bundle** with `source-map-explorer` or `rollup-plugin-visualizer` before shipping.

## Setup

See [implementation examples](references/example.md#strictmode--why-did-you-render-setup) for StrictMode, why-did-you-render, and custom hook debug label setup.

## Implementation Guidelines

- **Analysis**: Use `source-map-explorer` or `webpack-bundle-analyzer` / `rollup-plugin-visualizer` (Vite).
- **Linting**: Mandate `eslint-plugin-react-hooks` (exhaustive-deps) and Prettier.
- **Environment**: Use Vite over CRA. Manage environment variables with `.env`.
- **Build**: Configure Terser for production minification. Use `vite-plugin-pwa` for service workers.

## Anti-Patterns

- **No production profiling**: Remove `why-did-you-render` and debug tools before production builds.
- **No skipping StrictMode**: Keep `<React.StrictMode>` in dev to surface side effects early.
- **No CRA for new projects**: Use Vite for faster builds and better DX.
