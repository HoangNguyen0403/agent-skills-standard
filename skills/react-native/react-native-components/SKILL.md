---
name: react-native-components
description: Build modern React Native components using function components and composition. Use when building or refactoring React Native function components and composable UI.
metadata:
  triggers:
    files:
    - '**/*.tsx'
    - '**/*.jsx'
    keywords:
    - component
    - props
    - children
    - composition
    - presentational
    - container
---
# React Native Components

## **Priority: P0 (CRITICAL)**


## Implementation Guidelines

- **Function Components Only**: Use hooks. No class components.
- **Container/Presentational**: Separate logic (hooks, data fetching) from UI (JSX, styling).
- **Composition**: Use `children` prop. Prefer composition over prop drilling.
- **Props**: TypeScript interfaces. Destructure in params.
- **File Size**: Keep components < 250 lines. Split if larger.
- **One Component Per File**: Named exports for components.
- **Naming**: `PascalCase` for components. `use*` for hooks.
- **Imports**: Group - React → External → Internal → Styles.
- **Platform Components**: Use built-in (`View`, `Text`, `TouchableOpacity`). Avoid DOM (`div`, `span`).

## Anti-Patterns

- **No Classes**: Use hooks instead.
- **No Nested Components**: Define at top level.
- **No Inline Styles**: Use `StyleSheet.create`.
- **No Index Keys**: Use stable IDs.
- **No Deep Nesting**: Max 3 levels.

## References

See [references/patterns.md](references/patterns.md) for Container/Presentational split, HOCs, Render Props, Compound Components, and Slot patterns.