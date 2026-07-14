### Flutter quick start: shared-element-style card expansion

Use the **Long** range: `500ms` (within `400–600ms`).

```dart
class ExpandCard extends StatefulWidget {
  const ExpandCard({super.key});

  @override
  State<ExpandCard> createState() => _ExpandCardState();
}

class _ExpandCardState extends State<ExpandCard>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 500),
  );

  late final Animation<double> animation = CurvedAnimation(
    parent: controller,
    curve: Curves.fastOutSlowIn,
  );

  void onPanUpdate(DragUpdateDetails details) {
    controller.value += details.delta.dy / 400;
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onPanUpdate: onPanUpdate,
      onPanEnd: (_) => controller.value > 0.5
          ? controller.forward()
          : controller.reverse(),
      child: AnimatedBuilder(
        animation: animation,
        builder: (_, child) => Transform.scale(
          scale: 1 + animation.value * 0.15, // GPU-friendly transform
          child: Opacity(
            opacity: 0.7 + animation.value * 0.3, // GPU-friendly opacity
            child: child,
          ),
        ),
        child: const Card(child: Text('Tap or drag to expand')),
      ),
    );
  }

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }
}
```

For iOS, use a `500ms` `easeInOut` curve and connect back navigation to `interactivePopGesture` for an interruptible transition.

Avoid `linear` easing and avoid animating `width`, `height`, or padding. Profile the animation and target **60fps with no jank frames**; move heavy calculations outside animation frames.
