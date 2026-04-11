---
name: typescript-tooling
description: 'Development tools, linting, and build config for TypeScript. Use when configuring ESLint, Prettier, Jest, Vitest, tsconfig, or any TS build tooling. (triggers: tsconfig.json, .eslintrc.*, jest.config.*, package.json, eslint, prettier, jest, vitest, build, compile, lint)'
---

# TypeScript Tooling

## **Priority: P1 (OPERATIONAL)**

## Implementation Guidelines

- **Compiler**: Use **`tsc`** for CI builds; **`esbuild`** or **`ts-node`** for development.
- **Linting**: Enforce **`ESLint`** with **`@typescript-eslint/recommended`**. Enable **`strict type checking`**.
- **Formatting**: Mandate **`Prettier`** via **`lint-staged`** and **`.prettierrc`**.
- **Testing**: Use **`Vitest`** (or **`Jest`**) for unit/integration testing. Target **`> 80%`** line coverage.
- **Builds**: Use **`tsup`** (for library bundling) or **`Vite`** (for web applications).
- **TypeScript Config**: Aim for **`strict: true`** long-term. For existing projects with `strict: false`, incrementally enable flags: start with `strictNullChecks: true`, then add `noImplicitAny`, `strictFunctionTypes`. NOT flip `strict: true` in one step — it will break hundreds of files.
- **CI/CD**: Always run **`tsc --noEmit`** explicitly in build pipeline to catch type errors.
- **Error Supression**: Favor **`@ts-expect-error`** over `@ts-ignore` for documented edge-cases.

## ESLint Configuration

### Strict Mode Requirement

Enable `@typescript-eslint/recommended` at minimum. When `strict: false` in tsconfig, `no-unsafe-*` rules may produce excessive noise — suppress selectively with `@ts-expect-error` rather than disabling globally. Prefer strict rules in new files even without project-wide strict.

### Common Linting Issues & Solutions

#### Request Object Typing

**Problem**: `any` for Express request objects or duplicate inline interfaces.
**Solution**: Centralize in `src/common/interfaces/request.interface.ts`.

```typescript
import { RequestWithUser } from 'src/common/interfaces/request.interface';
```

#### Unused Parameters

**Problem**: Params flagged as unused by linter.
**Solution**: Prefix with `_` (e.g., `_data`) or remove. Never `eslint-disable`.

#### Test Mock Typing

**Problem**: Jest mocks trigger `unsafe-type` warnings with `expect.any()` or custom mocks.
**Solution**: Cast using `as unknown as TargetType`.

```typescript
mockRepo.save.mockResolvedValue(result as unknown as User);
```

## Configuration

New projects: `strict: true`. Existing (`strict: false`) — incremental path:

```json
// tsconfig.json — incremental migration
{
  "compilerOptions": {
    "strict": false,
    "strictNullChecks": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true
  }
}
```

## Verification Workflow (Mandatory)

After editing any `.ts` / `.tsx` file:

1. Call `getDiagnostics` (typescript-lsp MCP tool) — surfaces type errors in real time.
2. Run `tsc --noEmit` in CI — catches project-wide errors LSP may miss.
3. Run `eslint --fix` — auto-fix formatting and lint violations.

> **Fallback when typescript-lsp MCP unconfigured**: run `tsc --noEmit` directly — it catches same type errors without MCP tool.

`getDiagnostics` fastest feedback loop. Use it before every commit on modified files.

**LSP Exploration**: Use `getHover` to inspect inferred types inline. Use `getReferences` before renaming any symbol to verify all call sites.

## Anti-Patterns

- **No `@ts-ignore`**: Use `@ts-expect-error` — it self-documents intent and fails if the error disappears.
- **No `any` for request objects**: Import centralized interfaces from `src/common/interfaces/`.
- **No `eslint-disable` (global)**: Suppress per-line with inline comment; fix the root cause instead.
- **No atomic `strict: true` flip** on existing repos: migrate incrementally, starting with `strictNullChecks`.

## References

- [Config Examples & Linting Patterns](references/REFERENCE.md)
