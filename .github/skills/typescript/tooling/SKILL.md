---
name: TypeScript Tooling
description: Development tools, linting, and build configuration for TypeScript projects.
metadata:
  labels: [tooling, typescript, eslint, prettier, testing]
  triggers:
    files: ['tsconfig.json', '.eslintrc.*', 'jest.config.*', 'package.json']
    keywords: [eslint, prettier, jest, vitest, build, compile, lint]
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

## Reference & Examples

For testing configuration and CI/CD setup:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

best-practices | language
