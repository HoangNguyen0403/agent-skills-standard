Use a structure that keeps UI, logic, and navigation separate.

For screen-level architecture, MVVM is a strong default:

- ViewController/View: renders UI and forwards user events
- ViewModel: owns presentation logic, formatting, and view state
- Model/Service layer: handles domain data and side effects

A good ViewModel should avoid `UIKit` imports unless a platform type is truly unavoidable. It should expose state in a controlled way, such as `private(set)` properties or publishers like `@Published`, rather than public mutable state.

Example shape:

- `Input`: user actions like `didTapLogin()`
- `Output` or `ViewState`: loading, error message, rendered content

That makes state flow explicit and easy to test.

For navigation, use the Coordinator pattern:

- ViewControllers should not push or present screens directly
- Coordinators create ViewControllers, inject dependencies, and handle transitions
- Parent coordinators should remove child coordinators when a flow finishes

This keeps navigation out of UI classes and avoids tightly coupling screens together.

If the app is larger or more layered, use Clean Architecture ideas:

- View -> Interactor -> Presenter -> View in VIP/Clean Swift
- Or View, Interactor, Presenter, Entity, Router in VIPER

The main point is unidirectional flow: UI events go inward, formatted display state comes back outward. Business logic should not live in the ViewController.

Practical best practices:

- Keep business logic out of ViewControllers
- Inject services/repositories instead of creating them inside screens
- Keep ViewModel state read-only from the View
- Centralize navigation in Coordinators
- Prefer explicit contracts for inputs and outputs

Quick self-check:

- Does any ViewModel import `UIKit` unnecessarily?
- Does any ViewController call `navigationController?.pushViewController(...)` directly?
- Is ViewModel state publicly mutable?
- Are child coordinators removed after finishing?
- Is data flow clearly one-way?

If you follow those rules, your iOS architecture will stay more testable, modular, and easier to evolve.

