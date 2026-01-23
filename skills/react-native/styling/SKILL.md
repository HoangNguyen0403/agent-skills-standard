---
name: React Native Styling
description: StyleSheet API, Flexbox, theming, and responsive design.
metadata:
  labels: [react-native, styling, theme, flexbox, responsive]
  triggers:
    files: ['**/*.tsx', '**/*.ts']
    keywords: [StyleSheet, style, theme, responsive, flexbox]
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

## Code

```tsx
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 16, // Use consistent spacing (8, 12, 16, 24)
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    ...Platform.select({
      ios: { fontFamily: 'SF Pro' },
      android: { fontFamily: 'Roboto' },
    }),
  },
});
```

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

## Reference & Examples

See [references/theming.md](references/theming.md) for Design Tokens, Theme Systems, Responsive Scaling, and Shadow Helpers.

## Related Topics

common/best-practices | components
