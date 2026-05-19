# Coverage Analysis Report Template

## Section 1 — Executive Dashboard

```bash
## Coverage Dashboard — {JIRA_KEY}: {Summary}
Date: {today} | Market: {market} | Component: {component}

| Metric                   | Value     |
|--------------------------|-----------|
| Total AC-Platform Slots  | N         |
| Covered                  | N (XX%)   |
| Partial                  | N (XX%)   |
| Not Covered              | N (XX%)   |
| Web Coverage             | N/M (XX%) |
| Mobile Coverage          | N/M (XX%) |
| Existing TCs Found       | N         |
| Proposed New TCs         | N         |
| QE Debt Items Identified | N         |
```

> **Release Readiness verdict**: one sentence on whether coverage is sufficient to release.

## Section 2 — AC Coverage Heatmap

| AC  | Platform   | Behavior Summary | Mapped TC(s) | Status      | Risk | Gap Reason                                   |
| --- | ---------- | ---------------- | ------------ | ----------- | ---- | -------------------------------------------- |
| AC1 | Web        | ...              | {PROJECT}-T9937   | Partial     | HIGH | Generic objective, no field-level validation |
| AC2 | Mobile     | ...              | —            | Not Covered | HIGH | No TC found                                  |
| AC3 | Web+Mobile | ...              | {PROJECT}-T9940   | Covered     | —    | —                                            |

Risk scoring: **HIGH** = transaction/financial/order completion | **MEDIUM** = feature behavior/conditional display | **LOW** = UI/visual/cosmetic

## Section 3 — Quality Observations on Existing TCs

For each Partial or questionable TC:

- **Traceability gap**: objective references wrong ticket key
- **Generic objective**: verifies existence but no assertion on business logic
- **Step masking**: multiple ACs in one TC — failure cannot be attributed to one AC
- **Missing data-correctness assertion**: fields displayed but values not validated

## Section 4 — QE Debt (Missing Coverage Categories)

- **Data correctness**: financial values validated against DB, not just displayed?
- **Negative flows**: behavior when backend integrations are unavailable?
- **Role differentiation**: role-specific paths untested?
- **Boundary conditions**: edge cases (empty cart, misconfigured rules)?
- **Regression risk**: existing TCs in other tickets relying on the same screens?

| ID  | Item | Priority | Rationale |
| --- | ---- | -------- | --------- |
| D1  | ...  | P2       | ...       |

## Section 5 — Prioritized Action Plan

### P1 — Must Complete Before Release (Blocker Risk)

| #   | Action            | AC      | Rationale |
| --- | ----------------- | ------- | --------- |
| 1   | Create TC: [Name] | AC1 Web | [reason]  |

### P2 — Should Complete (High Confidence)

| #   | Action | AC  | Rationale |
| --- | ------ | --- | --------- |

### P3 — Nice to Have (Risk Accepted)

| #   | Action | AC  | Rationale |
| --- | ------ | --- | --------- |

### QE Debt — Backlog for Next Sprint

| #   | Action | Rationale |
| --- | ------ | --------- |

## Section 6 — Recommendations for QE Manager

1. **Release readiness**: sufficient to release? Risk if P1 items are not created?
2. **QE team actions**: TCs to create/update before sprint ends?
3. **Process improvement**: structural issues (combined TCs, wrong labels, generic objectives)?
