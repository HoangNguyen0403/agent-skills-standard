---
name: swift-swiftui
description: "Configure SwiftUI state, view lifecycle, and Property Wrappers correctly. Use when managing SwiftUI state, view lifecycle, or property wrappers like @State and @Binding. (triggers: **/*.swift, @State, @Binding, @ObservedObject, View, body)"
---

# SwiftUI Standards

## **Priority: P0**

## Implementation Guidelines

### State Management

- **@State**: @State for data owned by the view (e.g., toggle, text input). Private to the view.
- **@Binding**: @Binding for data passed down from a parent to a child. Two-way connection.
- **@ObservedObject**: @ObservedObject when receiving an instance from an external source.
- **@StateObject**: @StateObject when the view is creating the object instance. View owns lifecycle.
- **@EnvironmentObject**: inject data into the view's hierarchy via `.environmentObject()`. Shared across view hierarchy.

### View Composition

- **Extract Subviews**: Keep views small (<200 lines). Extract reusable components.
- **View Modifiers**: Chain modifiers for styling (`.font()`, `.padding()`).
- **Custom Modifiers**: Create `ViewModifier` for reusable styles.

### Performance

- **Avoid Heavy Computation**: Use `@State` + `.task()` for async work.
- **Equatable**: Conform views to `Equatable` to prevent unnecessary re-renders.
- **LazyStacks**: Use `LazyVStack`/`LazyHStack` when displaying a large number of views in a scrolling container to load them only as they appear.

## Anti-Patterns

- **No @ObservedObject for owned objects**: Use @StateObject.
- **No logic in body**: Move to computed properties or methods.
- **No ! in View**: Use if-let or nil coalescing.

## References

- [State & Binding](references/implementation.md)
