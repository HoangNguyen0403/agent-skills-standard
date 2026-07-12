The workflow should be concise, action-oriented, and structured as steps rather than long narrative sections. For a code review process, a strong workflow would cover the essential sequence without bloating the file with excessive examples.

Recommended structure:

1. Confirm review scope
   - Identify the PR, linked issue, target branch, and any stated acceptance criteria.
   - Note whether the review is for correctness, security, performance, maintainability, or release readiness.

2. Gather context
   - Read the PR description, changed files, and relevant tests.
   - Skim any architecture notes or related tickets only if needed to understand intent.

3. Inspect the change
   - Review logic, data flow, error handling, naming, and edge cases.
   - Check whether the implementation matches the described behavior.

4. Check risk areas
   - Security: auth, input handling, secrets, permissions.
   - Reliability: retries, timeouts, null handling, failure modes.
   - Maintainability: duplication, unclear abstractions, oversized functions.
   - Performance: unnecessary queries, loops, or repeated expensive work.

5. Review tests
   - Verify happy path, edge cases, and regression coverage.
   - Note missing tests if important behavior changed without validation.

6. Validate locally if needed
   - Run targeted tests or linters when the review requires stronger evidence.
   - Prefer the smallest useful verification set.

7. Write findings
   - Lead with actionable issues.
   - Separate blocking defects from suggestions.
   - Reference concrete files, functions, or behaviors.

8. Conclude
   - State overall status: approve, request changes, or comment only.
   - Summarize the main risks or reasons for approval.

This is preferable to “all detailed steps and examples” because workflows are easier to follow when they define a repeatable path, decision points, and review criteria without turning into long-form documentation.

