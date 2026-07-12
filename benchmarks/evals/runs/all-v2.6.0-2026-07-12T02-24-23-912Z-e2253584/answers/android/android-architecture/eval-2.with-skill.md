Split the app primarily by feature, with shared capabilities in core modules:

```text
:app                 # DI root, Compose navigation, navigation guard
:feature:login       # Login UI/ViewModel and login-specific domain/data code
:feature:products    # Product-listing UI/ViewModel and product-specific code
:feature:cart        # Cart UI/ViewModel and cart-specific code
:core:ui             # Shared Compose design system
:core:network        # API client and network infrastructure
:core:database       # Local persistence infrastructure
```

Keep each feature internally layered: domain (pure Kotlin use cases/models), data (repository implementations and data sources), and UI (ViewModel plus Composables). The UI talks to the ViewModel, the ViewModel calls use cases, and repositories remain behind domain-facing interfaces. Keep feature dependencies deliberate and avoid coupling one feature directly to another; place genuinely shared code in `core`.

