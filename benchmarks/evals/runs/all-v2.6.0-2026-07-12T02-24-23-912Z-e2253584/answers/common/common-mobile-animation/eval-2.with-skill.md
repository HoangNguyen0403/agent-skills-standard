# Common mobile animation anti-patterns

- Using `linear` easing. It feels robotic; use a platform-standard curve such as `Curves.fastOutSlowIn`, `easeInOut`, or an appropriate ease-out curve.
- Making animations too long. Keep press feedback around 100–150 ms, navigation/modals around 250–350 ms, and complex/shared-element motion within 400–600 ms. No animation should exceed 600 ms.
- Animating layout-heavy properties such as `width`, `height`, padding, or large portions of the widget tree. This can trigger layout thrashing; prefer `transform` and `opacity`.
- Implementing gestures as one-way, non-interruptible animations. A drag should update progress continuously and settle to a clear endpoint on release, so the interaction remains fluid.
- Leaking animation resources. Dispose Flutter `AnimationController`s and invalidate iOS timers or related resources when the screen is destroyed.
- Doing heavy computation during animation frames or rebuilding expensive subtrees unnecessarily. Move work out of frame callbacks, reuse static children, and profile the result.
- Shipping without frame-rate verification. Check the profiler and target 60 fps with no jank frames; a visually correct animation is still a defect if it stutters.
