Measure the 8 minutes first, then optimize the slow stages without weakening correctness. Common improvements are:

- Cache the package-manager store and `.next/cache` between CI runs, keyed by the lockfile and relevant build inputs.
- Use a frozen lockfile and an efficient dependency install; avoid reinstalling tools or downloading fonts/assets during every build.
- Run lint, typecheck, unit tests, and the production build in parallel when they do not depend on one another, and use affected-package builds in a monorepo.
- Keep the build context small and avoid invalidating caches with timestamps or generated noise; inspect bundle/build traces for expensive imports.
- Reuse a prepared builder image or remote build cache when appropriate.

Do not skip typechecking, linting, tests, or security checks merely to reduce the number. Compare cold and warm builds, record cache hit rates, and verify that the output is reproducible. Turbopack or other experimental accelerators can help where supported, but validate production behavior and supported plugins before adopting them in the release gate.

