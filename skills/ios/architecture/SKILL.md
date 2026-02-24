---
name: iOS Architecture
description: Standards for MVVM, Coordinators, and Clean Architecture (VIP/VIPER).
metadata:
  labels: [ios, architecture, mvvm, coordinator, vips]
  triggers:
    files:
      [
        '**/*ViewModel.swift',
        '**/*Coordinator.swift',
        '**/*ViewController.swift',
      ]
    keywords: [MVVM, Coordinator, ViewState, Output, Input]
---

# iOS Architecture Standards

## **Priority: P0 (CRITICAL)**

## Implementation Guidelines

### MVVM (Model-View-ViewModel)

- **ViewModel Responsibility**: Handle business logic, formatting, and state. No UIKit imports (except for platform types like `UIImage` if strictly necessary).
- **ViewState**: Use a single state object or discrete `@Published` properties for UI updates.
- **Inputs/Outputs**: Define explicit protocols or nested types for inputs (events from View) and outputs (state for View).

### Coordinator Pattern

- **Navigation Logic**: Decouple ViewControllers from navigation logic. The Coordinator handles instantiation and push/present.
- **Dependency Injection**: Pass dependencies (Services, Repositories) through the Coordinator into the ViewModels.
- **Child Coordinators**: Maintain a hierarchy; remove child coordinators when their flow is finished.

### Clean Architecture (VIP/VIPER)

- **VIP (Clean Swift)**: Use Interactor for logic, Presenter for UI formatting, and ViewController for display.
- **Unidirectional Flow**: Data flows: View -> Interactor -> Presenter -> View.

## Anti-Patterns

- **No Logic in VC**: Move business logic to ViewModel/Interactor.
- **No Public ViewModel State**: Keep state private(set) or using publishers.
- **No Direct Navigation**: Use a Coordinator for screen transitions.

## Verification Checklist (Mandatory)

- [ ] **Pure ViewModel**: Does the ViewModel have any `UIKit` imports? (Prohibited)
- [ ] **Navigation**: Is `navigationController` used directly in the VC for transitions? (Use Coordinator)
- [ ] **State Access**: Is ViewModel state exposed as `public var`? (Use `private(set)` or publishers)
- [ ] **Deallocation**: Are child coordinators correctly removed from the parent's collection on finish?
- [ ] **VIP Unidirection**: Is the data flow unidirectional (View -> Interactor -> Presenter -> View)?

- [MVVM-C & VIP Implementation](references/implementation.md)
