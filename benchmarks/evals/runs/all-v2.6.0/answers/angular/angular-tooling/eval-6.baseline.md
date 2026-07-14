# Enable test coverage

For the Angular CLI test target, run tests once and collect coverage with:

```bash
ng test --watch=false --code-coverage
```

For a workspace with several projects, select one explicitly:

```bash
ng test my-app --watch=false --code-coverage
```

The CLI normally writes an HTML report under `coverage/<project-name>/`; open its `index.html` to inspect statements, branches, functions, and lines. It also emits machine-readable reports according to the project’s test-runner configuration, which can be uploaded by CI.

To make coverage the default for the project, set the test target’s `codeCoverage` option in `angular.json` (the exact builder block varies by Angular version):

```json
{
  "projects": {
    "my-app": {
      "architect": {
        "test": {
          "options": {
            "codeCoverage": true
          }
        }
      }
    }
  }
}
```

Keep `--watch=false` in CI so the command terminates. Treat coverage as a signal rather than proof of test quality, and configure thresholds in the project’s Karma/Jest coverage setup if the build must fail below a minimum. If the project uses Jest instead of the Angular CLI test runner, use that runner’s coverage command (commonly `jest --coverage`) and its own reporter configuration.

