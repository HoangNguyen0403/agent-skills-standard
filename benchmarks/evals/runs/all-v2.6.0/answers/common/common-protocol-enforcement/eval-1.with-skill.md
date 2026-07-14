Do not mark the feature complete yet. Apply a fresh protocol check:

1. Confirm the active skills and project workflows were loaded before the implementation was written.
2. Perform an adversarial audit for standard defaults where project-specific rules should apply.
3. Inspect the current diff and the resulting file contents, then compare them with the active skill anti-patterns. Fix any violation immediately.
4. Run the relevant tests, checks, or validation commands against the current state. A prior successful run is not evidence for the current state.
5. Record the concrete command and artifact that prove the feature works, including important negative or edge-case checks.
6. Check for execution shortcuts such as local mocks replacing shared fakes, hardcoded styles replacing design tokens, non-standard error handling, or a missing pre-write audit log.

Only after the fresh verification passes should the task be called complete. Functional success alone is not protocol success.

