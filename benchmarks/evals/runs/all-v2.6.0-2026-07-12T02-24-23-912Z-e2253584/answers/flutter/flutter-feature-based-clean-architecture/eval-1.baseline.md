Put it in its own feature boundary, for example:

```text
lib/features/promotions/
  data/
  domain/
  presentation/
```

Keep promotion-specific API clients, DTOs, and repository implementations in `data`; business entities, repository contracts, and use cases in `domain`; and pages, widgets, and state-management code in `presentation`. This makes the feature independently understandable and prevents a global layer from becoming a dumping ground.

If the application has a composition root, register the promotions dependencies there and expose navigation to its presentation entry point. Do not put promotions code under an unrelated feature such as orders simply because an order can use a promotion.

