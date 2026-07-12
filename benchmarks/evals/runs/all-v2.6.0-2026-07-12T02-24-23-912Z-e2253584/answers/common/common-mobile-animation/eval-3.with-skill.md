# Quick-start: Flutter fade-and-slide transition

Use a medium transition duration for navigation and animate only translation and opacity:

```dart
class Entrance extends StatefulWidget {
  const Entrance({super.key, required this.child});
  final Widget child;

  @override
  State<Entrance> createState() => _EntranceState();
}

class _EntranceState extends State<Entrance>
    with SingleTickerProviderStateMixin {
  late final AnimationController controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 300),
  )..forward();

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final motion = CurvedAnimation(
      parent: controller,
      curve: Curves.fastOutSlowIn,
    );

    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(0, 0.1),
        end: Offset.zero,
      ).animate(motion),
      child: FadeTransition(
        opacity: motion,
        child: widget.child,
      ),
    );
  }
}
```

The 300 ms duration fits navigation/modal motion, `fastOutSlowIn` avoids robotic linear movement, and slide/opacity avoid layout-triggering width or height changes. For a drag interaction, update the controller from `onPanUpdate` and animate it to `0.0` or `1.0` on release. Profile the screen and confirm a steady 60 fps with no jank.
