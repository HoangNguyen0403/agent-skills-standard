# Implementation Examples

## Flutter: Fade + Slide Transition (GPU-friendly)

```dart
// Flutter: fade + slide transition (GPU-friendly)
SlideTransition(
  position: Tween<Offset>(begin: const Offset(0, 0.1), end: Offset.zero)
      .animate(CurvedAnimation(parent: _controller, curve: Curves.fastOutSlowIn)),
  child: FadeTransition(opacity: _controller, child: content),
)
```

## iOS: Spring Animation for Natural Feel

```swift
// iOS: spring animation for natural feel
UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.8,
  initialSpringVelocity: 0.5, options: .curveEaseInOut) {
    view.transform = .identity
}
```
