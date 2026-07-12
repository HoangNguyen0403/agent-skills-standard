Create a top-level feature at `lib/features/promotions/`; keep features flat rather than nesting them under another feature. Separate it into the three architecture layers:

```text
lib/features/promotions/
  domain/
    entities/
    failures/
    repositories/
  data/
    datasources/
    dtos/
    repositories/
  presentation/
    bloc/          # or cubit/
    pages/
    widgets/
```

Put promotion business concepts and repository contracts in `domain/`, with no UI, networking, persistence, or framework dependencies. Put API/cache DTOs, data sources, and repository implementations in `data/`; those implementations may depend on the domain contracts. Put the BLoC/Cubit, screens, and feature-specific widgets in `presentation/`; they should interact with domain use cases or repository interfaces, not data implementations directly.

This maintains the allowed direction: `presentation -> domain <- data`. Put code that is truly reused beyond promotions in `lib/core/` or `lib/shared/`, rather than leaking it into the promotions feature.

