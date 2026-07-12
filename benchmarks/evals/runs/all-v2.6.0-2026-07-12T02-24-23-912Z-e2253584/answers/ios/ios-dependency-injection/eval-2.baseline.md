Common anti-patterns to avoid in iOS dependency injection include:

- Using singletons everywhere, which hides dependencies and makes testing harder.
- Relying on global state or service locators instead of explicit injection.
- Injecting too many dependencies into one type, which usually signals that the class has too many responsibilities.
- Creating dependencies directly inside view controllers or other consumers, which defeats the purpose of DI.
- Mixing object creation and business logic, making code harder to maintain and mock.
- Overengineering the DI setup with unnecessary complexity or frameworks for a small app.
- Using force-unwrapped or implicitly assumed dependencies that can crash at runtime if wiring is wrong.
- Letting lifecycle ownership become unclear, such as creating duplicate shared services or retaining objects too long.
- Hiding protocols behind abstractions that are too generic or meaningless, which adds indirection without improving testability.
- Performing injection too late, so objects can be used before their dependencies are fully configured.

In practice, the healthiest pattern is to keep dependencies explicit, inject them early, prefer protocol-based abstractions where they add real value, and keep composition centralized in a small part of the app.

