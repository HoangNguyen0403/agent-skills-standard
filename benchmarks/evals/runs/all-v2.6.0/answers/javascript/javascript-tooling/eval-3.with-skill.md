Priority: P1 (HIGH). Use ESLint with Prettier; enforce formatting on save and commit.

```bash
npm install -D eslint prettier eslint-config-prettier jest
```

`.eslintrc.js`

```js
module.exports = {
  extends: ['eslint:recommended', 'prettier'],
  rules: {
    'no-console': 'warn',
    'prefer-const': 'error',
  },
};
```

`.prettierrc`

```json
{
  "semi": true,
  "singleQuote": true,
  "printWidth": 80
}
```

`jest.config.js`

```js
export default {
  coverageThreshold: {
    global: { lines: 80 }
  }
};
```

`package.json`

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "jest --coverage"
  }
}
```

Co-locate tests with source files, target more than 80% coverage, and run lint before pushing. Use a consistent Pkg Manager (`npm`, `yarn`, or `pnpm`) with synchronized dependency versions. For builds, use Vite for apps or Rollup for libraries.
