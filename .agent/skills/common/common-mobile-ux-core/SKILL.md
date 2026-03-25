---
name: common-mobile-ux-core
description: "Universal mobile UX principles for touch-first interfaces. Enforces touch targets, safe areas, and mobile-specific interaction patterns. (triggers: **/*_page.dart, **/*_screen.dart, **/*_view.dart, **/*.swift, **/*Activity.kt, **/*Screen.tsx, mobile, responsive, SafeArea, touch, gesture, viewport)"
---

# Mobile UX Core

## **Priority: P0 (CRITICAL)**

Universal UX principles for mobile applications.

## Guidelines

- **Touch Targets**: Min 44x44pt (iOS) / 48x48dp (Android). Add padding if needed.
- **Safe Areas**: Wrap content in `SafeArea`/`WindowInsets`. Avoid notches.
- **Interactions**: Use active states (no hover). Haptic feedback (short).
- **Typography**: Min 16sp body. Line height 1.5x.
- **Keyboards**: Auto-scroll inputs. Set `InputType` (email/number) & `Action`.

## Code Examples

```dart
// ✅ Correct Target
IconButton(icon: Icon(Icons.close), padding: EdgeInsets.all(12))

// ❌ Too Small
Icon(Icons.close, size: 16)
```

## Anti-Patterns

- **No Hover Effects**: Mobile has no cursor. Use pressed states.
- **No Tiny Targets**: All clickable elements ≥44pt.
- **No Fixed Bottom**: Account for Home Indicator & Keyboard.
- **No OS Mix**: Use Material (Android) & Cupertino (iOS) conventions.

## Related Topics

mobile-accessibility | mobile-performance | flutter-design-system | react-native-dls
