# Splitting a platform-specific Button

Keep one public interface and choose the implementation behind it. For materially different behavior, use platform files:

```text
Button.tsx          # shared props/export, if useful
Button.ios.tsx      # iOS implementation
Button.android.tsx  # Android implementation
```

React Native resolves the platform-specific file automatically. Both implementations should satisfy the same typed props, accessibility contract, loading/disabled behavior, and test expectations. Share tokens, types, validation, and event semantics; keep only native interaction and visual differences platform-specific. For small differences, a single component with `Platform.select` is simpler. Avoid duplicating business logic and make unsupported platforms fail clearly or use a default implementation. Test each platform’s focus/press behavior, accessibility role/label, keyboard interaction, and visual states.

