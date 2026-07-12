Common iOS architecture anti-patterns to avoid:

- Putting business logic in `UIViewController`. Keep controllers thin and move logic into a `ViewModel`, `Interactor`, or equivalent layer.
- Letting the `ViewModel` depend on `UIKit`. A ViewModel should stay platform-light and focus on state, formatting, and behavior.
- Exposing mutable ViewModel state publicly. Prefer `private(set)`, bindings, or publishers so the view can observe state without mutating it directly.
- Skipping clear input/output boundaries. Define explicit events coming in from the view and explicit state/output going back.
- Handling navigation directly inside a `ViewController` with `navigationController?.pushViewController(...)`. Navigation should live in a Coordinator or Router.
- Constructing dependencies inside screens instead of injecting them. Services and repositories should be passed in from the composition/navigation layer.
- Forgetting to remove finished child coordinators. This often causes leaked flows and retained objects.
- Mixing formatting, networking, persistence, and navigation into one class. That creates “Massive View Controller” or “Massive ViewModel” problems.
- Breaking unidirectional flow in VIP/Clean Swift style architectures. Prefer a predictable flow such as View -> Interactor -> Presenter -> View.
- Choosing an architecture pattern but not enforcing its boundaries consistently. The anti-pattern is often not the pattern itself, but partial adoption that leaves responsibilities blurred.

