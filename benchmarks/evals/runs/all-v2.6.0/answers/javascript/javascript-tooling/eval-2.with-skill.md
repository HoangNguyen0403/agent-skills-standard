Priority: P1 (HIGH). Assuming an existing JavaScript project:

- No formatting wars: use Prettier consistently; run it on save and commit.
- No untested code: use TDD or add post-code tests with Jest/Vitest, co-located and targeting >80% coverage.
- No dirty commits: run ESLint and formatting checks before push.
- Avoid unsynchronized Pkg Manager versions across `npm`, `yarn`, or `pnpm`.
- Avoid mixing build tools unnecessarily: use Vite for apps and Rollup for libraries.
- Avoid disabling lint rules broadly; configure ESLint with recommended rules and Prettier integration.
