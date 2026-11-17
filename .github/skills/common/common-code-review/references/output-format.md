# Code Review Output Format

## Deterministic check gate

- A current orchestrator-observed required-check `FAIL` yields `CHANGES REQUESTED` for that failure before semantic lens review.
- Missing, unknown, `NOT RUN`, stale, or mismatched receipt data is an explicit evidence gap, never a pass. Continue useful static analysis without claiming technical readiness.

## Finding

`[Blocker|Major|Nit] path:line`  
`Evidence: exact source location or observed result`  
`Why: consumer, security, or merge risk`  
`Fix: concrete correction`  
`Prevent-by: lint | type | test | eval | runtime | guidance | none`

Use only Blocker, Major, or Nit. An observed/claimed result mismatch is a Blocker. No strengths or praise section. If code or a diff is unavailable, state the evidence needed before making a substantive finding.
