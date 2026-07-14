Put the feature in a flat directory:

```text
lib/features/promotions/
├── domain/
│   ├── entities/
│   ├── failures/
│   └── repositories/
├── data/
│   ├── models/
│   ├── datasources/
│   └── repositories/
└── presentation/
    ├── bloc/        # or cubit/
    ├── pages/
    └── widgets/
```

Use the layers as follows:

- `domain/`: promotion entities, failures, and repository interfaces; zero external dependencies.
- `data/`: DTOs/models, data sources, and repository implementations; depends only on Domain.
- `presentation/`: BLoC/Cubit, pages, and widgets; depends only on Domain.

Maintain the dependency rule:

```text
Presentation -> Domain <- Data
```

Put reusable cross-cutting code in `lib/shared/` or `lib/core/`. Keep `lib/features/` flat—no nested features. Cross-feature imports may use Domain types/entities, but never import another feature’s `data/` or `presentation/` layers (for example, promotions must never import loyalty’s `data/` or `presentation/` layers).
