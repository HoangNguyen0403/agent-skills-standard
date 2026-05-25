# PRD Validation Checklist

Before finalizing the PRD, verify the following:

## Completeness

- [ ] **Problem Clear?**: Does the summary explain _why_ we are building this?
- [ ] **Metrics Clear?**: Are primary metrics, secondary metrics, and guardrails measurable?
- [ ] **Scope Defined?**: Is "Out of Scope" populated to prevent creep?
- [ ] **Use Cases Scoped?**: Does each use case have a specific persona, goal, and boundary?
- [ ] **No TBDs**: Are there any critical "To Be Determined" items left? (If yes, move to Open Questions).

## Verifiability (Testing)

- [ ] **Testable AC**: Are Acceptance Criteria binary (Pass/Fail)?
- [ ] **Gherkin Where Needed**: Do ambiguous behaviors use Given/When/Then?
- [ ] **Path Coverage**: Does each meaningful story cover happy, edge, and negative paths?
- [ ] **INVEST**: Are stories independent, negotiable, valuable, estimable, small, and testable?
- [ ] **Error Path**: Is there at least one requirement for error handling/failure states?

## Clarity

- [ ] **No Tech Jargon in Stories**: User stories should be understandable by a non-technical PO.
- [ ] **Specific Actor**: No story uses generic "user" when a concrete role exists.
- [ ] **Distinct Priorities**: Are P0 (Must Have) clearly separated from P1/P2?

## Feasibility

- [ ] **Tech Align**: Do requirements fit the specific Technical Guardrails?
- [ ] **Dependencies**: Are external APIs or assets identified?
- [ ] **Analytics/Ops**: Are telemetry, rollout, support, and changelog entries present?
