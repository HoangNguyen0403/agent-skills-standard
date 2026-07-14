Assume Flutter and iOS are the target platforms.

- Choose duration by interaction:
  - `100–150ms`: toggles and cell presses
  - `250–350ms`: navigation and modals
  - `400–600ms`: shared-element or complex-state transitions
  - Never exceed `600ms`.

- Use platform-standard easing:
  - Flutter/Material: `Curves.fastOutSlowIn`
  - iOS: `.easeInOut`
  - Avoid `linear`.

- Animate GPU-friendly properties such as `transform` and `opacity`. Avoid animating `width`, `height`, `padding`, or other layout-triggering properties.

Flutter quick start for a shared-element transition using the required long range:

```dart
class HeroCard extends StatefulWidget {
  const HeroCard({super.key});

  @override
  State<HeroCard> createState() => _HeroCardState();
}

class _HeroCardState extends State<HeroCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 500), // Long: 400–600ms
  );

  late final Animation<double> opacity = CurvedAnimation(
    parent: controller,
    curve: Curves.fastOutSlowIn,
  );

  @override
  void initState() {
    super.initState();
    controller.forward();
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: opacity,
      child: Transform.scale(
        scale: 0.96 + (0.04 * opacity.value),
        child: const FlutterLogo(size: 96),
      ),
    );
  }
}
```

For gestures, connect the gesture progress directly to the animation so it remains interruptible:

```dart
GestureDetector(
  onPanUpdate: (details) {
    final progress = (details.localPosition.dx / context.size!.width)
        .clamp(0.0, 1.0);
    controller.value = progress;
  },
  onPanEnd: (_) {
    if (controller.value > 0.5) {
      controller.forward();
    } else {
      controller.reverse();
    }
  },
  child: child,
)
```

On iOS, use `UIViewPropertyAnimator` with `.easeInOut`, and integrate back navigation with `interactivePopGesture` for fluid interactive screen transitions.

Finally, profile the animation and target `60fps` with no jank frames. Keep heavy calculations, image decoding, and data processing outside animation frames. In Flutter, always `dispose()` every `AnimationController`; on iOS, invalidate timers and other animation-related callbacks when the view is removed.
