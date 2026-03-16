---
name: flutter-performance
description: "Optimization standards for rebuilds and memory. Use when optimizing Flutter widget rebuilds, reducing memory usage, or improving rendering performance. (triggers: lib/presentation/**, pubspec.yaml, const, buildWhen, ListView.builder, Isolate, RepaintBoundary)"
---

# Performance

## **Priority: P1 (OPERATIONAL)**

Performance optimization techniques for smooth 60fps Flutter applications.

- **Rebuilds**: Use `const` widgets and `buildWhen` / `select` for granular updates.
- **Lists**: Always use `ListView.builder` for item recycling.
- **Heavy Tasks**: Use `compute()` or `Isolates` for parsing/logic.
- **Repaints**: Use `RepaintBoundary` for complex animations. Use `debugRepaintRainbowEnabled` to debug.
- **Images**: Use `CachedNetworkImage` + `memCacheWidth`. `precachePicture` for SVGs.
- **Keys**: Provide `ValueKey` for list items and stable IDs for reconciliation.
- **Resource Cleanup**: Dispose controllers/streams in `dispose()`.
- **Pagination**: Default to 20 items per page for network lists.
- **Build Purity**: Keep `build` methods free of heavy work; move logic to BLoC/Application.
- **Image Resizing**: Always set `maxWidth`/`maxHeight` when loading images.

## 🚫 Anti-Patterns

- **Large Rebuilds**: `**No SetState at Root**: Use granular builders (BlocBuilder, Consumer).`
- **Logic in Build**: `**No Heavy Work in body**: Perform parsing/sorting in the Business Layer.`
- **Missing Const**: `**No Dynamic Leaf Widgets**: Use const where possible.`

```dart
BlocBuilder<UserBloc, UserState>(
  buildWhen: (p, c) => p.id != c.id,
  builder: (context, state) => Text(state.name),
)
```


## 🚫 Anti-Patterns

- Do NOT use standard patterns if specific project rules exist.
- Do NOT ignore error handling or edge cases.
