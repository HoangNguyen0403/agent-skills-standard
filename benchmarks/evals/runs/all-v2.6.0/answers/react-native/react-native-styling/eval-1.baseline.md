# Applying React Native styles

Prefer `StyleSheet.create` for static styles and compose styles with arrays for variants:

```tsx
const styles = StyleSheet.create({
  title: {fontSize: 18, fontWeight: '600'},
  disabled: {opacity: 0.5},
});

<Text style={[styles.title, disabled && styles.disabled]} />
```

Inline objects are valid, but new objects are allocated on each render and can obscure reuse, make variants harder to audit, and encourage scattered magic values. They are reasonable for truly dynamic one-off values, especially when the value depends on runtime measurement; keep such values small and intentional. Use shared tokens/primitives for design consistency, memoize expensive derived styles only when profiling justifies it, and avoid premature optimization. Remember that React Native style props are not CSS: use supported properties, flexbox defaults, and platform-aware layout primitives. Test accessibility, dynamic text, and both platforms.

