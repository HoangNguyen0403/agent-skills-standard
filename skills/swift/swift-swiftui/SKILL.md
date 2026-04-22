---
name: swift-swiftui
description: Configure SwiftUI state, view lifecycle, and Property Wrappers correctly. Use when managing SwiftUI state, view lifecycle, or property wrappers like @State and @Binding.
metadata:
  triggers:
    files:
    - '**/*.swift'
    keywords:
    - "@State"
    - "@Binding"
    - "@ObservedObject"
    - View
    - body
---
# SwiftUI Standards

## **Priority: P0**

## Implementation Guidelines

### State Management

- **@State**: @State for data owned by view (e.g., toggle, text input). Private.
- **@Binding**: @Binding for data passed down from parent to child. Two-way.
- **@ObservedObject**: @ObservedObject when receiving instance from external source.
- **@StateObject**: `@StateObject` when the view is creating the object instance — view owns lifecycle.
- **@EnvironmentObject**: `@EnvironmentObject` to inject data into the view's hierarchy via `.environmentObject()`. Shared across view hierarchy.

### View Composition

- **Extract Subviews**: Views < 200 lines. Extract reusable components.
- **View Modifiers**: Chain modifiers for styling (`.font()`, `.padding()`).
- **Custom Modifiers**: Create `ViewModifier` for reusable styles.

### Performance

- **Avoid Heavy Computation**: Use `@State` + `.task()` for async work.
- **Equatable**: Conform views to `Equatable` to prevent unnecessary re-renders.
- **LazyStacks**: `LazyVStack`/`LazyHStack` when displaying large number of views in scrolling container to load them only as they appear.

## Anti-Patterns

- **No @ObservedObject for owned objects**: Use @StateObject.
- **No logic in body**: Move to computed properties or methods.
- **No ! in View**: Use if-let or nil coalescing.

## References

- [State & Binding](references/implementation.md)
