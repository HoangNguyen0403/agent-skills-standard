# Common mobile animation best practices

Choose motion timing by interaction: use 100–150 ms for toggles and press feedback, 250–350 ms for navigation and modals, and 400–600 ms for shared-element or complex state changes. Never exceed 600 ms. Use the platform’s standard non-linear easing, such as Flutter’s `Curves.fastOutSlowIn` or iOS `easeInOut`; avoid `linear` easing.

Prefer GPU-friendly properties such as `transform`, translation/scale, and `opacity`. Avoid animating layout properties such as `width`, `height`, padding, or other values that force repeated layout. Make gesture-driven motion progress-based and interruptible—for example, update an animation controller from `onPanUpdate`, then settle it to either endpoint on release. Dispose Flutter `AnimationController`s and invalidate iOS timers/resources when their owner goes away.

Keep animation-frame work lightweight: move expensive calculations off the frame callback, reuse child widgets where possible, and profile the result. The target is 60 fps without jank. For navigation, combine a short slide with a fade and an appropriate curve so the transition communicates hierarchy without delaying the user.
