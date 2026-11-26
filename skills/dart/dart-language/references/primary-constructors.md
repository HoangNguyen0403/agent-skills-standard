# Primary Constructors (Dart 3.13+)

Gated feature. Declaring a primary constructor requires a package language version of **3.13 or newer**, which comes from the SDK constraint lower bound (`environment: sdk: ^3.13.0` or later). A Flutter project uses Flutter's bundled Dart — confirm it before emitting this syntax.

## Equivalent declarations

```dart
// Before: traditional constructor
class Point {
  int x;
  int y;

  Point(this.x, this.y);
}

// After: primary constructor
class Point(var int x, var int y);
```

The shorthand changes declaration syntax, not runtime behavior.

## Rules

- A parameter with `var` or `final` **declares and induces** the field. Without a modifier it is an ordinary constructor parameter and induces nothing.
- `final` on a parameter is reserved for declaring parameters in primary constructors; it is not a general parameter modifier in older code.
- A class, mixin class, or enum with a primary constructor cannot also declare a non-redirecting generative constructor in its body.
- Field initializers and the primary constructor's initializer list see the **parameter**; the constructor body block sees the **induced field**.
- Empty class bodies can end with `;`: `class Point(var int x, var int y);`

## Initializer list and body

```dart
class DeltaPoint(final int x, int delta) {
  final int y = x + delta; // field initializer sees the parameter
}

// Initializer list only: ends with ';'
class PositivePoint(final int x, final int y) {
  this : assert(x >= 0 && y >= 0);
}
```

`assert` here is a debug check, not a production invariant; keep an explicit runtime guard when the value can arrive from untrusted input.

## Const primary constructors

```dart
class const ConstPoint(final int x, final int y) {
  final int z;
  this : z = x + y; // initializer list only, no body block
}
```

A constant primary constructor requires all fields `final` (not `late`) and potentially constant initializers, and it cannot have a `{ ... }` body — even an empty one.

## When to keep traditional constructors

- Language version below 3.13, or an unverified Flutter-bundled Dart.
- Named/factory construction with redirecting or complex initialization logic.
- Public API shape that callers already depend on; the shorthand does not justify changing signatures.
