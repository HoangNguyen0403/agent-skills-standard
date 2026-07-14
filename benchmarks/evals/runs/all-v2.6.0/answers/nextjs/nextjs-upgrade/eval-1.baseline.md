Treat 13-to-15 as a dependency and behavior migration, not only a version edit. Make a branch, commit a clean baseline, and read the release/codemod notes for each major version. Before changing code, run the existing typecheck, lint, tests, and production build.

Upgrade in controlled steps: update Next and the compatible React/react-dom versions, run the official codemods, and resolve deprecated APIs. Audit App Router request APIs (`cookies`, `headers`, `params`, `searchParams`) for required async usage, middleware/runtime assumptions, Server Actions, image/font/config changes, and any Pages Router behavior. Revisit caching because defaults and APIs have evolved; make `no-store`, revalidation, tags, and client invalidation explicit. Test dynamic routes, auth redirects, streaming/loading/error states, metadata, and production deployment rather than relying on dev mode.

Use a lockfile, remove stale packages/config only after verifying consumers, and upgrade one major at a time when the intermediate migration is substantial. Roll out behind a canary with logs and a rollback artifact, then update the supported Node/React/toolchain versions and migration documentation.

