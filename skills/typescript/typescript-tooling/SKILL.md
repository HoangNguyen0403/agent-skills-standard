---
name: typescript-tooling
description: "Development tools, linting, and build config for TypeScript. Use when configuring ESLint, Prettier, Jest, Vitest, tsconfig, or any TS build tooling. (triggers: tsconfig.json, .eslintrc.*, jest.config.*, package.json, eslint, prettier, jest, vitest, build, compile, lint)"
---

# TypeScript Tooling

## **Priority: P1 (OPERATIONAL)**

Essential tooling for TypeScript development and maintenance.

## Implementation Guidelines

- **Compiler**: `tsc` for CI. `ts-node`/`esbuild` for dev.
- **Lint**: ESLint + `@typescript-eslint`. Strict type checking.
- **Format**: Prettier (on save + commit).
- **Test**: Jest/Vitest > 80% coverage.
- **Build**: `tsup` (libs), Vite/Webpack (apps).
- **Check**: `tsc --noEmit` in CI.

## Anti-Patterns

- **No Disable**: Avoid `// eslint-disable`.
- **No Skip**: Avoid `skipLibCheck: true` if possible.
- **No Ignore**: Use `@ts-expect-error` > `@ts-ignore`.

## ESLint Configuration

### Strict Mode Requirement

**CRITICAL**: Every file in the project, including tests (`.spec.ts`), must adhere to strict type-checked rules. NEVER turn off `@typescript-eslint/no-explicit-any` or `no-unsafe-*` rules.

### Common Linting Issues & Solutions

#### Request Object Typing

**Problem**: Using `any` for Express request objects or creating duplicate inline interfaces.
**Solution**: Use the centralized interfaces in `src/common/interfaces/request.interface.ts`.

```typescript
import { RequestWithUser } from 'src/common/interfaces/request.interface';
```

#### Unused Parameters

**Problem**: Function parameters marked as unused by linter.
**Solution**: Prefix the parameter with an underscore (e.g., `_data`) or remove it. NEVER use `eslint-disable`.

#### Test Mock Typing

**Problem**: Jest mocks triggering unsafe type warnings when `expect.any()` or custom mocks are used.
**Solution**: Cast the mock or expectation using `as unknown as TargetType`.

```typescript
mockRepo.save.mockResolvedValue(result as unknown as User);
```

## Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
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

`getDiagnostics` is the fastest feedback loop. Use it before every commit on modified files.

**LSP Exploration**: Use `getHover` to inspect inferred types inline. Use `getReferences` before renaming any symbol to verify all call sites.

## References

See [references/REFERENCE.md](references/REFERENCE.md) for CI config, test setup, and advanced ESLint rules.
