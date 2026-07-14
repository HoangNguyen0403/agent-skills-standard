# Replace hardcoded styles with design tokens

Create a typed token layer for colors, typography, spacing, radii, elevation, and dimensions. Components should consume semantic tokens such as `surface`, `textPrimary`, and `spaceMd`, not raw values or brand hex codes:

```ts
export const colors = {surface: '#FFFFFF', textPrimary: '#111827'} as const;
export const spacing = {sm: 8, md: 16, lg: 24} as const;
```

Expose tokens through a theme object or hook and build reusable primitives (`Text`, `Box`, `Button`) that apply the approved values. Use `StyleSheet.create` for stable styles, while allowing controlled variants or a small style override API. Replace values incrementally and document when an exception is allowed. Add lint rules or a custom static check for raw colors/spacing in component directories, and review new UI against the design system. Keep semantic names so a future theme or brand change does not require searching for hex values.

