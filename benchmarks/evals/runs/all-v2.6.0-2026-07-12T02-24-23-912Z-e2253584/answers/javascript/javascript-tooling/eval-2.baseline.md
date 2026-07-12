# JavaScript tooling anti-patterns to avoid

Avoid these common tooling failures:

- Committing generated output, `node_modules`, or local environment files when they are not source artifacts.
- Omitting the lockfile or allowing different package managers and Node versions to resolve dependencies differently.
- Having scripts that work only on one shell or operating system because of unportable command syntax.
- Using overlapping formatters and linters with contradictory rules, or disabling rules without documenting why.
- Running lint, tests, and builds only on a developer machine instead of enforcing them in CI.
- Pinning stale dependencies indefinitely or blindly applying major upgrades without changelog review and tests.
- Ignoring audit findings, shipping unnecessary production dependencies, or installing untrusted packages.
- Treating coverage percentage as proof of quality and missing integration, error-path, or behavior tests.
- Hiding failures with `|| true`, empty scripts, broad warning suppression, or overly permissive config.
- Putting secrets in `package.json`, source files, logs, or CI configuration that is not secret-managed.
