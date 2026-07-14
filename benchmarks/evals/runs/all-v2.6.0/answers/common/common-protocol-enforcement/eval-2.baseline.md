Run a structured self-scan instead of assuming the code is correct:

- Restate the intended behavior and compare every changed path against it.
- Inspect the complete diff, including deletions, configuration, tests, migrations, and generated files.
- Look for unhandled inputs, incorrect defaults, race conditions, resource leaks, authorization gaps, injection risks, secret exposure, and unsafe logging.
- Check error and retry behavior, idempotency, validation, backwards compatibility, and failure recovery.
- Confirm tests cover the normal path, boundaries, invalid input, and important regressions; add or run focused tests as appropriate.
- Run formatting, linting, type checks, unit tests, integration tests, and a build where applicable.
- Review the command output for skipped tests, warnings, flaky behavior, or environment-dependent assumptions.
- Check repository status and ensure no unrelated or temporary files are included.

For each finding, record the file and location, impact, confidence, and a concrete fix or verification step. If the scan cannot establish a fact, label it unverified rather than declaring success.

