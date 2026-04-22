---
name: common-mobile-ux-core
description: Enforce universal mobile UX principles for touch-first interfaces including touch targets, safe areas, and mobile-specific interaction patterns. Use when building mobile screens, handling touch interactions, or validating safe area compliance.
metadata:
  triggers:
    files:
    - '**/*_page.dart'
    - '**/*_screen.dart'
    - '**/*_view.dart'
    - '**/*.swift'
    - '**/*Activity.kt'
    - '**/*Screen.tsx'
    keywords:
    - mobile
    - responsive
    - SafeArea
    - touch
    - gesture
    - viewport
---
# Mobile UX Core

## **Priority: P0 (CRITICAL)**


## Guidelines

- **Touch Targets**: Min 44x44pt (iOS) / 48x48dp (Android). Add padding if needed.
- **Safe Areas**: Wrap content in `SafeArea`/`WindowInsets`. Avoid notches.
- **Interactions**: Use active states (no hover). Haptic feedback (short).
- **Typography**: Min 16sp body. Line height 1.5x.
- **Keyboards**: Auto-scroll inputs. Set `InputType` (email/number) & `Action`.

## Code Examples

- **Correct**: `IconButton(icon: Icon(Icons.close), padding: EdgeInsets.all(12))`
- **Avoid**: `Icon(Icons.close, size: 16)` (Touch target too small)

## Anti-Patterns

- **No Hover Effects**: Mobile no cursor; use pressed/active states instead
- **No Tiny Targets**: All clickable elements must ≥44pt
- **No Fixed Bottoms**: Always account for Home Indicator and Keyboard safe areas
- **No OS Mixing**: Respect Material (Android) and Cupertino (iOS) conventions separately

## Related Topics

mobile-accessibility | mobile-performance | flutter-design-system | react-native-dls