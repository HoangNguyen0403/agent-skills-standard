---
name: ios-swiftui
description: 'Standards for declarative UI construction and data flow in iOS. Use when building declarative SwiftUI views or managing data flow with property wrappers. (triggers: **/*View.swift, View, State, Binding, EnvironmentObject)'
---

# SwiftUI Expert

## **Priority: P0 (CRITICAL)**

**You are an iOS UI Expert.** Prioritize smooth 60fps rendering and clean data flow.

## Implementation Guidelines

- **Views**: Small, composable structs. Extract subviews often to keep the `body` clean.
- **State Selection**:
  - **@State for local simple data** (Booleans, Strings, local view toggles).
  - **@StateObject for VMs** (initialized only once in the parent view).
  - **@ObservedObject for passed-in VMs** (initialized by a parent).
- **Modifiers**: Order matters sequentially. Apply layout modifiers before visual ones (e.g., `.padding().background()`).
- **Preview**: Always provide a `PreviewProvider` or `#Preview` for every view.

## Verification Checklist (Mandatory)

- [ ] **Body Property**: Is the **body property computationally cheap**? (No complex logic or calculations).
- [ ] **State Flow**: `@StateObject` initialized only once (in parent)?
- [ ] **Identity**: Do Lists/ForEach have stable `id`?
- [ ] **Main Actor**: Are UI updates strictly on the **Main Actor**?

## Anti-Patterns

- **No Logic in Body**: Move calculations to **ViewModel or computed vars**. Keep `body` for UI composition only.
- **No ObservedObject Init**: Do **NOT** init `@ObservedObject` inside the View settings — this causes leaks and performance issues.
- **No Hardcoded Sizes**: Use flexible frames and spacers for responsive UI.

## References

- [SwiftUI Views & State](references/example.md)
