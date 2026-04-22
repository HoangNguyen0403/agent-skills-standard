---
name: flutter-performance
description: Optimize Flutter widget rebuilds, memory usage, and rendering performance. Use when diagnosing jank, reducing rebuilds, or improving list performance.
metadata:
  triggers:
    files:
    - 'lib/presentation/**'
    - 'pubspec.yaml'
    - 'ListView.builder'
    keywords:
    - const
    - buildWhen
    - Isolate
    - RepaintBoundary
---
# Performance

## **Priority: P1 (OPERATIONAL)**


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

## Anti-Patterns

- **No Root `setState()`**: Use `BlocBuilder` with `buildWhen` or `context.select()` for granular updates
- **No Heavy Business in `build()`**: Move sorting/filtering/heavy logic to BLoC or `compute()`
- **No Non-`const` Leaf Nodes**: Apply `const` to all static widgets to skip unnecessary reconciliation
- **No Large `Column` Lists**: Use `ListView.builder` for efficient item recycling in large lists

```dart
BlocBuilder<UserBloc, UserState>(
  buildWhen: (p, c) => p.id != c.id,
  builder: (context, state) => Text(state.name),
)
```