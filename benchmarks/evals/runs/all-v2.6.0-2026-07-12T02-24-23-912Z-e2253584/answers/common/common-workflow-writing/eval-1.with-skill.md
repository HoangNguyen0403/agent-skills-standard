The request should be rewritten as a compact workflow, not a detailed walkthrough with examples.

Goal: Complete a code review and return clear findings with severity, evidence, and decision.

Steps
- Gather context: collect PR description, changed files, related requirements, and test evidence.
- Inspect risk areas: review correctness, security, performance, maintainability, and test coverage.
- Validate claims: check whether changed behavior is supported by code, tests, or linked evidence.
- Record findings: capture only actionable issues with file/path evidence, impact, and recommended fix.
- Decide outcome: return approve, approve with nits, or request changes based on issue severity.

Output template

| finding_id | severity | file_or_scope | issue | evidence | recommended_action |
| --- | --- | --- | --- | --- | --- |

| decision | summary | blocking_issues | non_blocking_issues | missing_evidence |
| --- | --- | --- | --- | --- |

