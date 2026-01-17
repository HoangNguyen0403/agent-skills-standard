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

- **Compiler**:
  - Use `tsc` for type checking in CI/CD
  - Use `ts-node` for development scripts
  - Consider `esbuild` or `swc` for faster builds
- **Linting**:
  - Use ESLint with `@typescript-eslint` plugin
  - Enable recommended rules and strict type checking
  - Integrate with editor for real-time feedback
- **Formatting**:
  - Use Prettier for consistent code formatting
  - Configure to run on save and pre-commit
- **Testing**:
  - Use Jest or Vitest for unit tests
  - Configure TypeScript support with `ts-jest` or Vitest's native TS support
  - Aim for >80% code coverage on critical paths
- **Build Tools**:
  - Use `tsup` or `unbuild` for library builds
  - Use Vite or Webpack for application builds
- **Type Checking**: Run `tsc --noEmit` in CI to catch type errors

## Anti-Patterns

- **No Disable Linting**: Avoid `// eslint-disable` comments unless necessary
- **No Skip Type Checking**: Don't use `skipLibCheck: true` unless performance is critical
- **No Ignoring Errors**: Don't use `@ts-ignore`. Use `@ts-expect-error` with explanation

## Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

```javascript
// .eslintrc.js
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
  ],
  parserOptions: {
    project: './tsconfig.json',
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
  },
};
```

## Reference & Examples

For testing configuration and CI/CD setup:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

best-practices | language
