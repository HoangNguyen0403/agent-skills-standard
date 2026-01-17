---
name: JavaScript Tooling
description: Development tools, linting, and testing for JavaScript projects.
metadata:
  labels: [tooling, javascript, eslint, prettier, testing]
  triggers:
    files: ['.eslintrc.*', 'jest.config.*', 'package.json']
    keywords: [eslint, prettier, jest, test, lint, build]
---

# JavaScript Tooling

## **Priority: P1 (OPERATIONAL)**

Essential tooling for JavaScript development.

## Implementation Guidelines

- **Linting**:
  - Use ESLint with recommended rules
  - Configure for ES6+ and your environment (Node, browser)
  - Enable automatic fixing on save
- **Formatting**:
  - Use Prettier for consistent code style
  - Run on save and pre-commit
  - Configure to match team preferences
- **Testing**:
  - Use Jest or Vitest for unit testing
  - Write tests alongside code (co-location)
  - Aim for >80% coverage on critical paths
- **Build Tools**:
  - Use Vite for modern applications
  - Use esbuild or Rollup for libraries
  - Optimize for production builds
- **Package Manager**: Use npm, yarn, or pnpm consistently

## Anti-Patterns

- **No Inconsistent Formatting**: Always use a formatter
- **No Skipping Tests**: Write tests for new features
- **No Committing Lint Errors**: Fix linting issues before commit

## Configuration

```javascript
// .eslintrc.js
module.exports = {
  env: {
    node: true,
    es2022: true,
  },
  extends: [
    'eslint:recommended',
    'prettier',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'prefer-const': 'error',
    'no-var': 'error',
  },
};
```

```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

```javascript
// jest.config.js
export default {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Reference & Examples

For testing patterns and CI/CD:
See [references/REFERENCE.md](references/REFERENCE.md).

## Related Topics

best-practices | language
