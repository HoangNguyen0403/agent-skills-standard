---
name: Mobile Animation
description: Motion design principles for mobile apps. Covers timing curves, transitions, gestures, and performance-conscious animations.
metadata:
  labels: [mobile, animation, motion, transitions, ux]
  triggers:
    files:
      [
        '**/*_page.dart',
        '**/*_screen.dart',
        '**/*.swift',
        '**/*Activity.kt',
        '**/*Screen.tsx',
      ]
    keywords:
      [
        Animation,
        AnimationController,
        Animated,
        MotionLayout,
        transition,
        gesture,
      ]
---

# Mobile Animation

## **Priority: P1 (OPERATIONAL)**

Native-feeling motion design. Optimize for 60fps and platform conventions.

## Timing Standards

- **Short**: 100-150ms (Toggles, cell press)
- **Medium**: 250-350ms (Nav, modals)
- **Long**: 400-600ms (Shared element, complex state)
- **Limit**: Never >600ms.

## Guidelines

- **Easing**: Use `Curves.fastOutSlowIn` (Material) or `easeInOut` (iOS). Avoid `linear`.
- **Performance**: Animate `transform` (Scale/Translation) and `opacity`. Avoid `width`/`height`.
- **Gestures**: Implement `onPan` / `interactivePopGesture` for fluid UX.
- **Optimization**: Use `FadeTransition` / `SlideTransition` over `AnimatedBuilder` for simple cases.

[Animation Patterns](references/animation-patterns.md)

## Anti-Patterns

- **No Linear Easing**: Feels robotic.
- **No Layout Trashing**: Avoid animating properties that trigger layout (width, padding).
- **No Memory Leaks**: Always `dispose()` AnimationControllers.
- **No Blocking UI**: Run heavy calculations outside animation frames.

## Related Topics

mobile-ux-core | mobile-performance | flutter/animations
