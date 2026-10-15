# PRD Validation Checklist

Before finalizing the PRD, verify the following:

## Completeness

- [ ] **Problem Clear?**: Does the summary explain _why_ we are building this?
- [ ] **Metrics Clear?**: Are primary metrics, secondary metrics, and guardrails measurable?
- [ ] **Scope Defined?**: Is "Out of Scope" populated to prevent creep?
- [ ] **Use Cases Scoped?**: Does each use case have a specific persona, goal, and boundary?
- [ ] **Scope Tree Classified?**: For substantial scope, are all capabilities in the scope tree classified as in_scope, deferred, or excluded with one containment parent?
- [ ] **Omitted Capabilities Checked?**: Are missing or unmentioned domain capabilities explicitly raised as decisions for disposition rather than silently omitted or implemented?
- [ ] **Canonical Definitions?**: Are shared rules and functions defined once canonically and referenced across flows without duplicate definitions?
- [ ] **No Unowned Unknowns**: Are unknowns classified into confirmed evidence, testable assumptions, or blocking decisions with affected slice, consequence, owner, and required input (no unowned TBDs)?

## Verifiability (Testing)

- [ ] **Testable AC**: Are Acceptance Criteria binary (Pass/Fail)?
- [ ] **Gherkin Where Needed**: Do ambiguous behaviors use Given/When/Then?
- [ ] **Path Coverage**: Does each meaningful story cover happy, edge, and negative paths?
- [ ] **INVEST**: Are stories independent, negotiable, valuable, estimable, small, and testable?
- [ ] **Error Path**: Is there at least one requirement for error handling/failure states?
- [ ] **View Selected by Question?**: Are views and diagrams selected based strictly on the question being addressed (scope tree=capabilities, process=order, decision table=rules, state=lifecycle, sequence=interactions), with prose/tables used when sufficient?

## Clarity

- [ ] **No Tech Jargon in Stories**: User stories should be understandable by a non-technical PO.
- [ ] **Specific Actor**: No story uses generic "user" when a concrete role exists.
- [ ] **Distinct Priorities**: Are P0 (Must Have) clearly separated from P1/P2?

## Feasibility

- [ ] **Tech Align**: Do requirements fit the specific Technical Guardrails?
- [ ] **Dependencies**: Are external APIs or assets identified?
- [ ] **Analytics/Ops**: Are telemetry, rollout, support, and changelog entries present?
- [ ] **Scoped Change Impact?**: When requirements change, are affected REQs, ACs, contracts, approvals, and evidence identified carrying existing IDs without reopening settled decisions?
