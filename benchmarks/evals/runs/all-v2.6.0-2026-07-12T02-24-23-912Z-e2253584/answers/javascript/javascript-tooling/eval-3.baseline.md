# Quick-start tooling setup

A minimal project can define repeatable checks in `package.json`:

```json
{
  "private": true,
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "node src/index.js",
    "test": "node --test",
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check": "npm run format:check && npm run lint && npm test"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "prettier": "^3.0.0"
  }
}
```

Install dependencies with a committed lockfile, add `node_modules/` and local environment files to `.gitignore`, and run `npm run check` in CI. Pin the Node version used by contributors and CI, then expand lint, tests, type checking, and build validation as the project grows.
