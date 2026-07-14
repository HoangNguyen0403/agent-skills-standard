---
name: android-resources
description: Organize Android strings, drawables, fonts, themes, localization, and concrete resource-backed Compose values such as MaterialTheme colors. Use for resource declarations and their direct UI lookup; defer design-system token architecture, network image loading, lint-rule configuration, and general Compose implementation.
metadata:
  triggers:
    files:
    - 'strings.xml'
    - '**/*Screen.kt'
    keywords:
    - stringResource
    - plurals
    - R.string
---
# Android Resources Standards

## **Priority: P2 (MEDIUM)**

## Implementation Guidelines

### Strings & Localization

- **Define in XML**: All UI text must in **`strings.xml`**. Use **`stringResource(R.string.*)`** in Compose.
- **Formatting**: Use **format args (`%s`, `%d`)** instead of concatenation. Use **`plurals`** (e.g., `<item quantity="one">`) for quantity-sensitive strings.
- **Parity**: Maintain **Localizable.strings (iOS)** parity where possible for shared features.
- **Dynamic Access**: Use **`context.getString(R.string.id, args)`** for dynamic lookups.

### Assets / Drawables

- **Formats**: Prefer **VectorDrawables (`.xml`)** over RASTER images. Scale cleanly across density buckets (mdpi, hdpi, xhdpi, xxhdpi).
- **Plurals**: Use `resources.getQuantityString(R.plurals.items, count, count)` for quantity-sensitive strings.
- **Dark Mode**: Support **`Configuration.UI_MODE_NIGHT`** via **`values-night/`** qualifier or **`MaterialTheme`** tokens. Never use hardcoded hex colors in Layouts/Composables.
- **Themes**: Map all colors to **Design Tokens** (primary, surface, error) for consistent skinning.

## Anti-Patterns

- **No String Concatenation in UI**: Use format args (`%s`, `%d`) in strings.xml instead.
- **No Hardcoded UI Text**: All visible strings must defined in strings.xml.

## References

- [XML Structure](references/implementation.md)

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- %s
