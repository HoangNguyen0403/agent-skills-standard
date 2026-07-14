Common JavaScript tooling anti-patterns to avoid:

- Mixing package managers or omitting the lockfile; use one package manager and commit its lockfile.
- Using unpinned or overly broad dependency versions, causing non-reproducible installs.
- Relying on globally installed CLIs instead of project-local dependencies and `package.json` scripts.
- Ignoring the required Node.js/package-manager version; declare it with `engines` or a version manager file.
- Writing brittle shell-heavy scripts that are platform-dependent or silently ignore failures.
- Swallowing errors, disabling lint/type checks, or allowing non-zero commands to pass in CI.
- Duplicating configuration across tools instead of sharing a single source of truth.
- Running slow, redundant checks locally and in CI without caching or appropriate parallelization.
- Making formatting, linting, testing, and builds behave differently locally versus in CI.
- Using deprecated, unmaintained, or overlapping tools without a clear reason.
- Over-customizing standard tooling, creating complex configuration that is difficult to maintain.
- Publishing accidental files or secrets because package boundaries and ignore rules are not defined.
- Failing to validate scripts on clean environments, fresh installs, and supported operating systems.
