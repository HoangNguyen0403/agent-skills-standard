Usually, no. Put utilities used across multiple features in `lib/shared/` (or `lib/core/` for foundational infrastructure), while keeping feature-specific helpers inside their feature.

Use `lib/features/shared/` only if “shared” is itself a deliberate feature/domain boundary with its own behavior.
