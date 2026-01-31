# Mobile Animation Patterns

## 1. Easing Curves

**Flutter**

```dart
Curves.easeInOut       // Standard
Curves.fastOutSlowIn   // Material
Curves.easeOutCubic    // Exit
```

**iOS/Android**

- iOS: `UIView.AnimationCurve.easeInOut`
- Android: `FastOutSlowInInterpolator`

## 2. Page Transitions (Flutter)

```dart
PageRouteBuilder(
  pageBuilder: (context, anim, secAnim) => NextPage(),
  transitionsBuilder: (context, anim, secAnim, child) {
    return SlideTransition(
      position: anim.drive(
        Tween(begin: Offset(1, 0), end: Offset.zero)
          .chain(CurveTween(curve: Curves.easeOutCubic))
      ),
      child: child,
    );
  },
  transitionDuration: Duration(milliseconds: 300),
)
```

## 3. Gestures

```dart
GestureDetector(
  onPanUpdate: (details) => _controller.value += details.delta.dx / width,
  onPanEnd: (_) => _controller.animateTo(_controller.value > 0.5 ? 1.0 : 0.0),
)
```

## 4. Performance Optimization

**Expensive (Avoid):**

```dart
AnimatedBuilder(builder: (ctx, ch) => Opacity(opacity: val, child: Container(width: 100 * val)))
```

**Optimized (Use):**

```dart
FadeTransition(opacity: anim, child: Transform.scale(scale: val, child: box))
```
