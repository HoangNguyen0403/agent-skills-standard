---
name: Swift SwiftUI
description: Standards for State Management, View Lifecycle, and Property Wrappers
metadata:
  labels: [swift, swiftui, state, binding, view]
  triggers:
    files: ['**/*.swift']
    keywords: ['@State', '@Binding', '@ObservedObject', 'View', 'body']
---

# SwiftUI Standards

## **Priority: P0**

## Implementation Guidelines

### State Management

- **@State**: Private UI state owned by the view (e.g., toggle, text input).
- **@Binding**: Two-way connection to parent's @State.
- **@ObservedObject**: Reference to external observable object.
- **@StateObject**: View owns the lifecycle of the object.
- **@EnvironmentObject**: Shared data across view hierarchy.

### View Composition

- **Extract Subviews**: Keep views small (<200 lines). Extract reusable components.
- **View Modifiers**: Chain modifiers for styling (`.font()`, `.padding()`).
- **Custom Modifiers**: Create `ViewModifier` for reusable styles.

### Performance

- **Avoid Heavy Computation**: Use `@State` + `.task()` for async work.
- **Equatable**: Conform views to `Equatable` to prevent unnecessary re-renders.
- **LazyStacks**: Use `LazyVStack`/`LazyHStack` for large lists.

## Anti-Patterns

- **@ObservedObject Ownership**: `**No @ObservedObject for owned objects**: Use @StateObject.`
- **Heavy body**: `**No logic in body**: Move to computed properties or methods.`
- **Force Unwrap in Views**: `**No ! in View**: Use if-let or nil coalescing.`

## References

- [State & Binding](references/implementation.md)
