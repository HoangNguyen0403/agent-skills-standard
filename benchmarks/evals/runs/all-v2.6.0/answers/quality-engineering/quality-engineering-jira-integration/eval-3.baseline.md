Assuming Jira with Zephyr:

1. Identify test cases covering the refactored checkout behavior.
2. For still-valid tests, update steps, expected results, preconditions, and test data.
3. For tests that no longer apply, mark them `Obsolete`/`Deprecated` and add a short reason. Prefer archiving over deletion so execution history and auditability remain intact.
4. Create new test cases for changed or newly introduced behavior; use stable, descriptive names and avoid reusing obsolete case IDs.
5. Review each checkout story’s links and acceptance-criteria coverage. Remove obsolete links and link replacement tests to the relevant Jira issues.
6. Update test cycles/executions: exclude obsolete cases from future runs, preserve historical executions, and regenerate coverage metrics.
7. Run a final traceability check: every current acceptance criterion has an executable test, and every obsolete case has either been updated or explicitly retired.

Document the refactor version/date and migration mapping, for example: `Old ZTC-123 → Updated ZTC-456`, so reviewers can follow the history.
