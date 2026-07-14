Common iOS architecture anti-patterns to avoid:

- Massive View Controllers: putting networking, parsing, state, and navigation into UIKit/SwiftUI views or controllers.
- Tight coupling: UI, business logic, and data layers directly depending on each other.
- No clear separation of concerns: models handling UI work, views making API calls, coordinators owning domain logic.
- Singleton overuse: global shared state that becomes hard to test and reason about.
- God managers/services: one “AppManager” or “DataManager” doing too many unrelated jobs.
- Leaky abstractions: exposing persistence or API details to presentation code.
- Callback pyramids / unstructured async flow: async work without clear ownership, cancellation, or error propagation.
- Business logic in views: formatting, validation, permissions, and workflow decisions living in UI code.
- Inconsistent state ownership: multiple sources of truth across view models, caches, and stores.
- Skipping dependency injection: hardcoded dependencies that block testing and modularity.
- Poor navigation architecture: routing scattered across screens instead of centralized flow coordination.
- Ignoring testability: architecture that cannot be unit tested without launching the app.
- Premature over-engineering: adding too many layers, protocols, or patterns for simple features.
- Weak module boundaries: feature code shared randomly across the app instead of grouped by domain or feature.
- Mixing domain and infrastructure concerns: business rules depending directly on Core Data, networking, or UIKit.

Good architecture usually aims for clear boundaries, explicit dependencies, single responsibility, and easy testing.

