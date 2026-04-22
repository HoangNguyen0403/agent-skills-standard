---
name: ios-architecture
description: Apply MVVM, Coordinators, and Clean Architecture (VIP/VIPER) in iOS apps. Use when applying MVVM, Coordinators, or VIP/VIPER architecture in iOS apps.
metadata:
  triggers:
    files:
    - '**/*ViewModel.swift'
    - '**/*Coordinator.swift'
    - '**/*ViewController.swift'
    keywords:
    - MVVM
    - Coordinator
    - ViewState
    - Output
    - Input
---
# iOS Architecture Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### MVVM (Model-View-ViewModel)

- **ViewModel Responsibility**: Handle business logic, formatting, and state. No UIKit imports (except for platform types like `UIImage` if strictly necessary).
- **ViewState**: Use single state object or discrete `@Published` properties for UI updates. **Expose state as `private(set)` or using publishers**.
- **Inputs/Outputs**: Define explicit protocols or nested types for inputs (events from View) and outputs (state for View).

### Coordinator Pattern

- **Navigation Logic**: Decouple ViewControllers from navigation logic. **Coordinator handles instantiation and push/present**. ** NOT use `navigationController` directly in ViewController for screen transitions.**
- **Dependency Injection**: **Pass dependencies** (Services, Repositories) through **Coordinator into ViewModels**.
- **Child Coordinators**: Maintain hierarchy; **correctly remove child coordinators** from parent's collection when their flow finished.

### Clean Architecture (VIP/VIPER)

- **VIP (Clean Swift)**: Use Interactor for logic, Presenter for UI formatting, and ViewController for display.
- **Unidirectional Flow**: Data flows: **View -> Interactor -> Presenter -> View**.
- **VIPER**: (View, Interactor, Presenter, Entity, Router) — another common architectural pattern for iOS apps.

## Anti-Patterns

- **No Logic in VC**: Move business logic to ViewModel/Interactor.
- **No Public ViewModel State**: Keep state **private(set)** or using publishers.
- **No Direct Navigation**: Use Coordinator for screen transitions. Never use `navigationController` directly.

## Verification Checklist (Mandatory)

- [ ] **Pure ViewModel**: ViewModel any `UIKit` imports? (Prohibited)
- [ ] **Navigation**: `navigationController` used directly in VC for transitions? (Use Coordinator)
- [ ] **State Access**: ViewModel state exposed as `public var`? (Use `private(set)` or publishers)
- [ ] **Deallocation**: child coordinators correctly removed from parent's collection on finish?
- [ ] **VIP Unidirection**: data flow unidirectional (View -> Interactor -> Presenter -> View)?

## References

- [MVVM-C & VIP Implementation](references/implementation.md)