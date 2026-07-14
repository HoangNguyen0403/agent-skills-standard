**Priority: P1 (HIGH).**

Implement JavaScript tooling as follows:

- **Linting:** Use ESLint with recommended rules and Prettier integration. Fix issues on save.
- **Formatting:** Use Prettier, running it on save and before commits.
- **Testing:** Use Jest or Vitest. Co-locate tests with source files and enforce more than 80% coverage.
- **Build:** Use Vite for applications and Rollup for libraries.
- **Pkg Manager:** Choose npm, yarn, or pnpm, and keep versions synchronized across environments.

Example ESLint configuration:

```javascript
// .eslintrc.js
module.exports = {
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
  },
};
```

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 80
}
```

```javascript
// jest.config.js
export default {
  coverageThreshold: {
    global: {
      lines: 80
    }
  }
};
```

Add linting and tests to CI, and run linting before pushing. Let Prettier settle formatting decisions to avoid formatting wars, and follow TDD or add post-code tests so there is no untested code or dirty commit.
