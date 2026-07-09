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
- **State Selection (iOS 17+, default)**:
 - **@State for local simple data** (Booleans, Strings, local view toggles).
 - **@State for VMs marked `@Observable`** (owning parent creates it once: `@State private var vm = MyViewModel()`).
 - **Plain `let`/property for passed-in `@Observable` VMs** — no wrapper needed, child views auto-track only the fields they read.
- **Legacy (pre-iOS 17 or Combine `ObservableObject` VMs)**:
 - **@StateObject for VMs** (initialized only once in parent view).
 - **@ObservedObject for passed-in VMs** (initialized by parent).
 - Prefer migrating `ObservableObject` VMs to `@Observable` when the deployment target allows it — see [ios-state-management](../ios-state-management/SKILL.md).
- **Modifiers**: Order matters sequentially. Apply layout modifiers before visual ones (e.g., `.padding().background()`).
- **Preview**: Always provide `PreviewProvider` or `#Preview` for every view.

## Verification Checklist (Mandatory)

- [ ] **Body Property**: **body property computationally cheap**? (No complex logic or calculations).
- [ ] **State Flow**: `@State`/`@StateObject` VM initialized only once (in parent)?
- [ ] **Identity**: Lists/ForEach stable `id`?
- [ ] **Main Actor**: UI updates strictly on **Main Actor**?

## Anti-Patterns

- **No Logic in Body**: Move calculations to **ViewModel or computed vars**. Keep `body` for UI composition only.
- **No ObservedObject Init**: **NOT** init `@ObservedObject` inside View settings — this causes leaks and performance issues.
- **No New `ObservableObject` VMs on iOS 17+**: Use `@Observable` for new code; reserve `ObservableObject`/`@Published` for code that must support pre-17 or already depends on Combine operators.
- **No Hardcoded Sizes**: Use flexible frames and spacers for responsive UI.