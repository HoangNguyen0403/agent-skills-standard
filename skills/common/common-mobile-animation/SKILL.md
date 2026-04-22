---
name: common-mobile-animation
description: Apply motion design principles for mobile apps covering timing curves, transitions, gestures, and performance-conscious animations. Use when implementing screen transitions, gesture-driven interactions, shared-element animations, or optimizing animation frame rates on iOS, Android, or Flutter.
metadata:
  triggers:
    files:
    - '**/*_page.dart'
    - '**/*_screen.dart'
    - '**/*.swift'
    - '**/*Activity.kt'
    - '**/*Screen.tsx'
    keywords:
    - Animation
    - AnimationController
    - Animated
    - MotionLayout
    - transition
    - gesture
---
# Mobile Animation

## **Priority: P1 (OPERATIONAL)**


## Timing Standards

| Duration | Range | Use Case |
|----------|-------|----------|
| Short | 100-150ms | Toggles, cell press |
| Medium | 250-350ms | Navigation, modals |
| Long | 400-600ms | Shared element, complex state |

**Hard limit**: Never exceed 600ms for any animation.

## Workflow

1. **Choose duration** from timing table based on interaction type.
2. **Select easing curve** per platform — `Curves.fastOutSlowIn` (Material) or `easeInOut` (iOS). Never use `linear`.
3. **Animate GPU-friendly properties** (`transform`, `opacity`). Avoid `width`/`height` which trigger layout.
4. **Wire gestures** using `onPan` / `interactivePopGesture` for fluid, interruptible UX.
5. **Verify frame rate** in profiler — target 60fps with no jank frames.

See [implementation examples](references/implementation.md) for Flutter and iOS animation patterns.

## References

- [Animation Patterns](references/animation-patterns.md)

## Anti-Patterns

- **No linear easing**: Feels robotic; always use platform-standard curves.
- **No layout thrashing**: Avoid animating properties that trigger layout (width, padding).
- **No memory leaks**: Always `dispose()` AnimationControllers in Flutter; invalidate timers in iOS.
- **No blocking UI**: Run heavy calculations outside animation frames.

## Related Topics

- [common-mobile-ux-core](../common-mobile-ux-core/SKILL.md)
- [flutter-performance](../../flutter/flutter-performance/SKILL.md)
- [common-performance-engineering](../common-performance-engineering/SKILL.md)