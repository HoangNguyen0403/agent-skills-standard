---
name: ios-swiftui
description: Build declarative UI and manage data flow with SwiftUI in iOS. Use when building declarative SwiftUI views or managing data flow with property wrappers.
metadata:
  triggers:
    files:
    - '**/*View.swift'
    keywords:
    - View
    - State
    - Binding
    - EnvironmentObject
---
# SwiftUI Expert

## **Priority: P0 (CRITICAL)**

**Role**: iOS UI Expert. Prioritize smooth 60fps, clean data flow.

## Implementation Guidelines

- **Views**: Small, composable structs. Extract subviews often to keep `body` clean.
- **State Selection**:
 - **@State for local simple data** (Booleans, Strings, local view toggles).
 - **@StateObject for VMs** (initialized only once in parent view).
 - **@ObservedObject for passed-in VMs** (initialized by parent).
- **Modifiers**: Order matters sequentially. Apply layout modifiers before visual ones (e.g., `.padding().background()`).
- **Preview**: Always provide `PreviewProvider` or `#Preview` for every view.

## Verification Checklist (Mandatory)

- [ ] **Body Property**: **body property computationally cheap**? (No complex logic or calculations).
- [ ] **State Flow**: `@StateObject` initialized only once (in parent)?
- [ ] **Identity**: Lists/ForEach stable `id`?
- [ ] **Main Actor**: UI updates strictly on **Main Actor**?

## Anti-Patterns

- **No Logic in Body**: Move calculations to **ViewModel or computed vars**. Keep `body` for UI composition only.
- **No ObservedObject Init**: **NOT** init `@ObservedObject` inside View settings — this causes leaks and performance issues.
- **No Hardcoded Sizes**: Use flexible frames and spacers for responsive UI.

## References