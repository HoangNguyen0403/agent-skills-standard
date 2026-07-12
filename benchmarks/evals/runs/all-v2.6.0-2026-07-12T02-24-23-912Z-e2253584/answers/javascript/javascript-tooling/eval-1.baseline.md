# JavaScript tooling best practices

Set up a reproducible toolchain and run it consistently locally and in CI:

- Pin a supported Node.js version with `engines` plus `.nvmrc`, `.node-version`, or the project’s equivalent.
- Commit the lockfile and use one package manager consistently.
- Configure ESLint for correctness and maintainability, and use Prettier for formatting where the project adopts it.
- Use a test runner with coverage thresholds appropriate to the risk of the code.
- Add type checking with TypeScript or JSDoc when it improves correctness.
- Define small `package.json` scripts such as `lint`, `format:check`, `typecheck`, `test`, and `build`.
- Run the same checks in CI, cache dependencies safely, and fail the build on actionable errors.
- Keep dependencies current through review, audit production dependencies, and avoid unnecessary packages.

Document setup and supported commands in the README. Prefer configuration shared by the repository over editor-only settings.
