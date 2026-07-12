Usually no. A `features/shared` directory blurs the distinction between a feature and application-wide code, and it tends to accumulate unrelated utilities.

Put genuinely cross-cutting, feature-independent utilities in a top-level shared/core area, for example `lib/core/` or `lib/shared/`. Typical contents are logging, error/result types, networking primitives, design-system widgets, extensions, constants, and generic helpers. Keep this layer independent of individual features.

If a utility is only shared by two features but represents a real business capability, consider extracting a small dedicated feature or domain package with a clear public API. Otherwise, keep it private to the feature until reuse is demonstrated. Do not move code to shared merely to shorten an import path; shared code should have stable ownership and no dependency on feature presentation layers.

