# Quality Contract

## Test Intent Record

Record one row before each behavior/risk group:

| Field | Required evidence |
| --- | --- |
| `contract` | Observable result or side effect owned by the application |
| `fault` | Plausible regression that would make the test fail |
| `layer` | Smallest honest layer and why broader behavior is not needed |
| `cases` | Minimal distinct equivalence classes; merge equivalent inputs |
| `command` | Exact focused, single-run command |

The record is an agent handoff artifact, not a comment requirement inside test code.

## Admission checks

- Before proposing a new test, compare against the existing suite; discard if the behavior and fault are already covered by nearby or upstream tests.
- For existing tests: never auto-delete on apparent static duplication alone. Recommending deletion requires proof of no unique behavioral contribution plus measured full-suite dynamic coverage/mutation impact; otherwise suggest review or refactoring.
- Keep a case only when it detects a distinct fault, boundary, or contract rule.
- Prefer public behavior and state transitions over private methods, call counts, or mock existence.
- Verify one logical contract per test; multiple assertions are allowed when verifying related aspects or outward side effects of that single contract.
- Distinguish outward side effects from internal mock choreography: verify what the system produces or changes externally, not how collaborators are invoked internally.
- Coverage percentages are diagnostic rather than admission gates; never write padding tests to hit an arbitrary target.
- The Four Pillars (Protection against Regressions, Resistance to Refactoring, Fast Feedback, Maintainability) provide a qualitative reasoning framework, not a static numeric score (avoid inventing formulas like $P \times R \times F \times M$ per test without rigorous empirical measurement across all four dimensions).
- Route cross-component behavior to integration/contract tests. Do not label a mock-heavy orchestration test as a unit test.
- Use deterministic fixtures, explicit cleanup, and stable clocks/data. A test that passes only in one order is not evidence.

## RED taxonomy

| Status | Meaning | Next action |
| --- | --- | --- |
| `expected_red` | Owned behavior is missing or wrong | Implement the smallest fix |
| `invalid_red` | Import, syntax, fixture, mock, or environment defect | Repair test setup; do not change production |
| `unexpected_green` | Behavior already exists or test is redundant | Inspect existing coverage and revise/remove case |
| `verification_infra_failed` | Runner missing, timeout, or orphaned process | Stop, clean owned processes, report exact command/error |

## Escalation ladder

1. Lint/type preflight when configured.
2. One focused test target, foreground and sequential.
3. Related unit file/package after the slice is green.
4. Integration/contract target only when the changed boundary requires it.
5. Full suite only for an explicit repository or release gate.

Use the repository timeout when present; otherwise use 120 seconds for a focused command. Never retry without a changed hypothesis. Never use a broad `pkill`; terminate only the process group created for the command and verify it is gone.
