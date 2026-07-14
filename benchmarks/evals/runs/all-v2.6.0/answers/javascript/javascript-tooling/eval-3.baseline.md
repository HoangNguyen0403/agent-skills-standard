```bash
npm init -y
npm install -D eslint prettier vitest
```

`package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "test": "vitest run"
  }
}
```

Example workflow:

```bash
npm run format
npm run lint
npm test
```

Use `npm run test -- --watch` during development for Vitest watch mode.
