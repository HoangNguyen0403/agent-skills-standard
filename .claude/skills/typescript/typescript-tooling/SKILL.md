---
name: typescript-tooling
description: Development tools, linting, and build config for TypeScript. Use when configuring ESLint, Prettier, Jest, Vitest, tsconfig, or any TS build tooling.
metadata:
  triggers:
    files:
    - 'tsconfig.json'
    - '.eslintrc.*'
    - 'jest.config.*'
    - 'package.json'
    keywords:
    - eslint
    - prettier
    - jest
    - vitest
    - build
    - compile
    - lint
---
# TypeScript Tooling

## **Priority: P1 (HIGH)**

## Implementation Guidelines

- **Compiler**: Use `tsc` for CI builds; `esbuild` or `ts-node` for development.
- **Linting**: Enforce `ESLint` with `@typescript-eslint/recommended`. Enable strict type checking.
- **Formatting**: Mandate `Prettier` via `lint-staged` and `.prettierrc`.
- **Testing**: Use `Vitest` (or `Jest`) for unit/integration testing. Target > 80% line coverage.
- **Builds**: Use `tsup` (library bundling) or `Vite` (web applications).
- **TypeScript Config**: Aim for `strict: true` long-term. For existing projects, migrate incrementally: start with `strictNullChecks`, then `noImplicitAny`, `strictFunctionTypes`. Do NOT flip `strict: true` in one step.
- **CI/CD**: Always run `tsc --noEmit` in build pipeline to catch type errors.
- **Error Suppression**: Favor `@ts-expect-error` over `@ts-ignore` for documented edge-cases.

## ESLint Configuration

Enable `@typescript-eslint/recommended` at minimum. When `strict: false` in tsconfig, `no-unsafe-*` rules may produce excessive noise — suppress selectively with `@ts-expect-error` rather than disabling globally.

See [reference](references/REFERENCE.md) for common linting issues (request typing, unused params, test mock typing) and tsconfig migration examples.

## Verification Workflow (Mandatory)

After editing any `.ts` / `.tsx` file:

1. Prefer a TypeScript LSP `getDiagnostics` tool when the host provides one — real-time type errors.
2. Run `tsc --noEmit` in CI — catches project-wide errors the editor may miss.
3. Run `eslint --fix` — auto-fix formatting and lint violations.

> **Without typescript-lsp MCP**: `tsc --noEmit` is the check; do not block on an unavailable tool.

Use `getHover`/`getReferences` only when an LSP tool is actually configured.

## Compiler Compatibility

- Pin `typescript` in the lockfile; check `tsc --version` before adopting newer syntax.
- TS 7 defaults differ (`strict` true, `module` `esnext`, `types` `[]`, `rootDir` `./`) and it ships no compiler API. A peer needing the API (`typescript-eslint`, plugins, custom transformers) must stay on TS 6, e.g. via the `@typescript/typescript6` alias — do not force the upgrade.

## Anti-Patterns

- **No `@ts-ignore`**: Use `@ts-expect-error` — self-documents intent, fails if error disappears.
- **No `any` for request objects**: Import centralized interfaces from `src/common/interfaces/`.
- **No `eslint-disable` (global)**: Suppress per-line; fix root cause instead.
- **No atomic `strict: true` flip** on existing repos: migrate incrementally starting with `strictNullChecks`.

## References

- [Config Examples & Linting Patterns](references/REFERENCE.md)
