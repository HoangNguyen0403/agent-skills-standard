---
name: Flutter Performance
description: Optimization standards for rebuilds and memory.
metadata:
  labels: [performance]
  triggers:
    files: ['lib/presentation/**', 'pubspec.yaml']
    keywords: [const, buildWhen, ListView.builder, Isolate, RepaintBoundary]
---

# Performance

## **Priority: P1 (OPERATIONAL)**

Performance optimization techniques for smooth 60fps Flutter applications.

- **Rebuilds**: Use `const` widgets and `buildWhen` / `select` for granular updates.
- **Lists**: Always use `ListView.builder` for item recycling.
- **Heavy Tasks**: Use `compute()` or `Isolates` for parsing/logic.
- **Repaints**: Use `RepaintBoundary` for complex animations. Use `debugRepaintRainbowEnabled` to debug.
- **Images**: Use `CachedNetworkImage` + `memCacheWidth`. `precachePicture` for SVGs.

```dart
BlocBuilder<UserBloc, UserState>(
  buildWhen: (p, c) => p.id != c.id,
  builder: (context, state) => Text(state.name),
)
```
