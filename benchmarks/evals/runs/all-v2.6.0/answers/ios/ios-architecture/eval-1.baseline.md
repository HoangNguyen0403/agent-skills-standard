Use a modular, layered architecture with clear separation of concerns.

- Split the app into presentation, domain, and data layers.
- Keep view controllers or SwiftUI views thin; move business logic into view models or use cases.
- Use dependency injection so components are easy to test and replace.
- Define protocols for services, repositories, and coordinators.
- Keep networking, persistence, and business rules out of UI code.
- Organize features by module or feature folder instead of by technical type only.
- Use coordinators or a routing pattern for navigation in larger apps.
- Prefer unidirectional data flow where practical for predictability.
- Write unit tests for domain and view model logic, and integration tests for key flows.
- Centralize cross-cutting concerns like logging, configuration, and error handling.

Common good choices are MVVM for medium apps, or Clean Architecture / modular feature architecture for larger codebases.

