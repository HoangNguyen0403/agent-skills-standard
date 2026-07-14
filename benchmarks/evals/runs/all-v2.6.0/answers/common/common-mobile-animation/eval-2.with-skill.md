Common mobile animation anti-patterns to avoid:

- Using `linear` easing; use platform-standard curves such as Flutter’s `Curves.fastOutSlowIn` or iOS `easeInOut`.
- Exceeding the 600ms hard limit. Typical ranges: 100–150ms for presses, 250–350ms for navigation/modals, and 400–600ms for shared elements or complex state.
- Animating layout-triggering properties such as `width`, `height`, or `padding`; prefer GPU-friendly `transform` and `opacity`.
- Creating layout thrashing that causes dropped frames or jank; profile animations and target 60fps.
- Implementing gesture animations that are not fluid or interruptible; wire them through `onPan` or iOS `interactivePopGesture`.
- Leaking animation resources: call `dispose()` for Flutter `AnimationController`s and invalidate iOS timers.
- Performing heavy calculations on animation frames; move expensive work outside the animation loop.
