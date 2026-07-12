Split primarily by feature, with a small set of stable shared modules:

- `:feature:auth` (login UI, ViewModel, and auth-specific presentation logic)
- `:feature:products` (product-list UI and presentation logic)
- `:feature:cart` (cart UI and presentation logic)
- `:core:model` (shared domain models such as `Product` and `CartItem`)
- `:core:data` or feature-owned data modules (repositories, network, and database implementations)
- `:core:ui`/`:core:designsystem` for genuinely shared UI components
- `:app` for application setup and top-level navigation

Keep dependencies directed inward: UI depends on use cases or domain interfaces, while data implementations satisfy those interfaces. Avoid making the feature modules depend directly on one another; share stable contracts/models through a core module and communicate between screens through navigation or interfaces. Start with a few meaningful modules and split further only when ownership, build performance, or team boundaries justify it. Use `implementation` by default and expose only intentional public APIs.

