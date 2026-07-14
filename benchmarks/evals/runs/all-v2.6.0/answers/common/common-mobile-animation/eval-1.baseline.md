Assumption: you’re building a native or cross-platform iOS/Android app.

- Animate state changes, not decoration. Use motion to show hierarchy, continuity, feedback, and progress.
- Prefer transform and opacity (`translation`, `scale`, `rotation`, `alpha`) over layout, shadow, blur, and large bitmap changes.
- Keep interactions responsive:
  - Micro-feedback: 100–200 ms
  - Standard transitions: 200–350 ms
  - Emphasis or navigation: 300–500 ms
  - Use ease-out when entering, ease-in when leaving, and spring motion for direct manipulation.
- Tie gestures to progress continuously; release into a velocity-aware spring rather than starting a separate timer-based animation.
- Run animations on the UI/native thread:
  - iOS: `UIViewPropertyAnimator`, SwiftUI `withAnimation`
  - Android: `Animator`, `Transition`, Jetpack Compose `animate*` APIs
  - React Native: `Animated` with `useNativeDriver: true`, or Reanimated worklets
  - Flutter: `AnimationController` and `Tween`
- Avoid blocking input, network work, or rendering during animation. Cancel or replace obsolete animations when state changes.
- Maintain a frame budget: target 60 FPS, and support 120-Hz displays where available. Profile dropped frames on representative low-end devices.
- Make motion accessible:
  - Respect iOS Reduce Motion and Android animation-scale settings.
  - Provide an app-level reduced-motion mode.
  - Replace large movement and parallax with fades or instant state changes.
  - Never communicate essential information through motion alone.
- Preserve usability: animations should not delay actions, trap focus, or create excessive flashing. Avoid repeated or looping motion unless it conveys active progress.
- Keep motion consistent through shared durations, easing curves, spring constants, and transition patterns.
- Test cold start, long lists, rapid repeated actions, interrupted gestures, orientation changes, dynamic type/font scaling, dark mode, and reduced-motion settings.
- Centralize animation tokens, for example:

```text
fast: 150 ms
standard: 250 ms
emphasis: 400 ms
reducedMotion: 0 ms
```

A good default is: native-thread animation, transform/opacity properties, 150–350 ms transitions, interruptible state-driven logic, and an explicit reduced-motion fallback.
