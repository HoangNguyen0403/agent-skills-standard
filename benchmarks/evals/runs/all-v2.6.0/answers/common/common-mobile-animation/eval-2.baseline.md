Common mobile-animation anti-patterns to avoid:

- Animating everything, causing visual noise and distraction.
- Using animations that are too slow, delaying task completion.
- Using abrupt, linear, or inconsistent easing that feels unnatural.
- Animating layout-heavy properties such as width, height, or position when transforms or opacity would suffice, causing dropped frames.
- Blocking interaction until an animation finishes.
- Ignoring reduced-motion and accessibility preferences.
- Repeating looping animations that consume battery or distract users.
- Using inconsistent durations, easing, or motion direction across screens.
- Relying only on animation to communicate important state changes.
- Animating off-screen or invisible elements unnecessarily.
- Failing to handle interruptions, rapid taps, navigation, or state changes cleanly.
- Adding motion without a clear purpose, such as feedback, continuity, hierarchy, or orientation.
- Using platform-inconsistent behavior that conflicts with native interaction conventions.
- Neglecting low-end devices, backgrounding, orientation changes, or slow network states.
