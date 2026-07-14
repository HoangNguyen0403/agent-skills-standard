Run the self-scan against the current source and current diff; do not rely on memory or an earlier inspection.

- Protocol state: verify the applicable skills and workflows were loaded before writing.
- Adversarial audit: search for standard defaults where repository-specific rules should exist.
- Diff/content audit: read the changed files immediately after the write and compare them with every active skill anti-pattern.
- Execution-bias audit: look for local mocks instead of shared fakes, hardcoded styles instead of design tokens, try/catch blocks without standard error handling, and a missing pre-write audit log.
- Evidence audit: identify the exact current command, test, or artifact proving the behavior; earlier test output is stale evidence.

If any check fails, stop the completion claim and correct the issue, then repeat the scan. The final report should state the findings and the fresh verification evidence rather than merely saying the implementation appears correct.

