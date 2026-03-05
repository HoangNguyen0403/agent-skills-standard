# PRD Validation Checklist

Before finalizing the PRD, verify the following:

## Completeness

- [ ] **Problem Clear?**: Does the summary explain _why_ we are building this?
- [ ] **Scope Defined?**: Is "Out of Scope" populated to prevent creep?
- [ ] **No TBDs**: Are there any critical "To Be Determined" items left? (If yes, move to Open Questions).

## Verifiability (Testing)

- [ ] **Testable AC**: Are Acceptance Criteria binary (Pass/Fail)?
  - _Bad_: "Make it fast."
  - _Good_: "Load time < 200ms on 4G."
- [ ] **Error Path**: Is there at least one requirement for error handling/failure states?

## Clarity

- [ ] **No Tech Jargon in Stories**: User stories should be understandable by a non-technical PO.
- [ ] **Distinct Priorities**: Are P0 (Must Have) clearly separated from P1/P2?

## Feasibility

- [ ] **Tech Align**: Do requirements fit the specific Technical Guardrails?
- [ ] **Dependencies**: Are external APIs or assets identified?
