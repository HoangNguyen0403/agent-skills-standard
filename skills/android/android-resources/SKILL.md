---
name: android-resources
description: "Standards for Strings, Drawables, and Localization. Use when managing Android resources, drawables, or adding localization support. (triggers: strings.xml, **/*Screen.kt, stringResource, plurals, R.string)"
---

# Android Resources Standards

## **Priority: P2**

## Implementation Guidelines

### Strings

- **Define in XML**: All UI text must be in `strings.xml`.
- **Formatting**: Use format args (`%s`, `%d`) instead of concatenation.
- **Plurals**: Use `<plurals>` for quantities.

### Assets / Drawables

- **Vectors**: Prefer VectorDrawables (`.xml`) over RASTER images.
- **Dark Mode**: Use `values-night` or Theme attributes (`MaterialTheme.colorScheme.primary`) instead of hardcoded colors.

## Anti-Patterns

- **No String Concatenation in UI**: Use format args (`%s`, `%d`) in strings.xml instead.
- **No Hardcoded UI Text**: All visible strings must be defined in strings.xml.

## References

- [XML Structure](references/implementation.md)
