Urgency does not remove the TDD requirement. Even for a tiny fix, begin with a failing test that reproduces the bug, then make the smallest change that turns the test green.

Why this matters:

- It proves the bug actually existed in a reproducible form.
- It prevents a false fix where the code changes but the original failure was never captured.
- It creates a regression guard so the same issue does not quietly return later.

A disciplined minimal path is:

1. Write one focused failing test that demonstrates the urgent bug.
2. Run it and confirm the failure matches the defect.
3. Apply the smallest production change needed.
4. Re-run the tests until green.
5. Refactor only if necessary and only with tests still passing.

If time is tight, reduce scope, not rigor. Keep the test small and specific, but do not skip the failing-test-first step.

