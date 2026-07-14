Implement JavaScript tooling as a reproducible, automated workflow:

- Pin supported Node.js versions with `.nvmrc` or `engines` in `package.json`.
- Commit exactly one lockfile and use `npm ci` in CI.
- Add ESLint for correctness and code-quality rules.
- Add Prettier for formatting; run it through `prettier --check`.
- Use scripts with consistent names:

```json
{
  "scripts": {
    "lint": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "vitest run",
    "test:watch": "vitest",
    "check": "npm run format:check && npm run lint && npm test"
  }
}
```

- Prefer modern ESLint flat configuration (`eslint.config.js`) and explicitly ignore generated files such as `dist/`, `coverage/`, and `node_modules/`.
- Configure tests with a maintained runner such as Vitest or Jest; keep tests deterministic and fail on unhandled errors.
- Run `npm run check` locally and in CI on every pull request.
- Use pre-commit hooks only for fast checks, such as linting staged files; keep full tests in CI.
- Avoid global tool installations. Pin tool versions in `devDependencies`.
- Separate build, test, lint, formatting, and type-checking scripts.
- Cache dependencies in CI, but always install from the lockfile.
- Fail fast on lint, formatting, test, or build errors.
- Keep configuration minimal, documented, and consistent across local development and CI.
