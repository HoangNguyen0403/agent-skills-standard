---
name: react-native-styling
description: Style React Native apps with StyleSheet API, Flexbox, theming, and responsive design. Use when implementing React Native styles, theming, Flexbox layouts, or responsive design.
metadata:
  triggers:
    files:
    - '**/*.tsx'
    - '**/*.ts'
    keywords:
    - StyleSheet
    - style
    - theme
    - responsive
    - flexbox
---
# React Native Styling

## **Priority: P1 (OPERATIONAL)**

## Implementation Guidelines

- **StyleSheet.create**: Always use over inline objects (optimized, validated).
- **Flexbox**: Default layout. No CSS Grid.
- **Responsive**: Use `Dimensions`, `useWindowDimensions`, or percentage widths.
- **Theming**: Centralize colors, fonts in `theme/` folder.
- **Platform Styles**: Use `Platform.select` for conditional styles.
- **Dark Mode**: Use React Context + `useColorScheme()`.

## Responsive Design

```tsx
const { width } = useWindowDimensions();
const isSmall = width < 375;
```

## Anti-Patterns

- **No Inline Styles**: Use `StyleSheet.create`.
- **No Magic Numbers**: Use theme constants.
- **No Absolute Positioning**: Avoid unless necessary.
- **No Fixed Widths**: Use flex or percentages.

## References

See [references/theming.md](references/theming.md) for StyleSheet examples, Design Tokens, Theme Systems, Responsive Scaling, and Shadow Helpers.