---
name: common-business-requirements
description: Standardize BRD and BRD-lite discovery for business goals, stakeholder impact, current-to-future state, and measurable value outcomes. Use when creating BRD, business case, project justification, ROI narrative, or AS-IS to TO-BE scope.
metadata:
  triggers:
    files:
      - "BRD.md"
      - "docs/brd/brd-*.md"
      - "specs/*.md"
    keywords:
      - create brd
      - business requirements
      - business case
      - stakeholder impact
      - as-is to to-be
      - roi justification
---

# Business Requirements Expert

## **Priority: P0 (CRITICAL)**

Frame the business "Why" before product or technical specs.

## 1. Discovery Workflow

- Draft executive summary: purpose, outcome, sponsor, validation owner.
- Confirm business objective and success metric.
- Identify sponsor, decision-maker, and impacted stakeholders.
- Capture AS-IS process pain and TO-BE target state.
- Define scope boundary, exclusions, assumptions, and constraints.
- Record value hypothesis: cost, revenue, risk, compliance, or cycle-time impact.
- **Handoff Quality**: Identify the **Handoff Owner** (BA Lead) and the next accountable team member (Product Manager).
- Add glossary terms when stakeholder or domain language can be misread.
- Add Mermaid AS-IS/TO-BE process diagram when workflow complexity affects approval.

## 2. BRD-lite Drafting

- Load `references/brd-template.md`.
- Keep each objective SMART: specific, measurable, achievable, relevant, and time-bound.
- Link each BRD objective to a candidate PRD requirement placeholder (`REQ-*`).
- **Offshore Ready**: Include stakeholder validation plan and acceptance window for remote delivery teams.
- Write to `docs/brd/brd-[slug].md`.

## 3. Quality Gate

- Every objective has an owner and KPI target.
- Every in-scope item has a rationale and out-of-scope pair.
- Risk register includes mitigation owner.
- Stakeholder approvals and unresolved decisions are explicit.
- Functional behavior is routed to PRD/SRS, not buried in BRD.

## Anti-Patterns

- No solution design in BRD.
- No vague goals ("improve efficiency") without baseline and target.
- No missing owners for objectives or risks.
- No silent scope expansion after approval.
- No jargon without glossary entry.

## References

- [BRD Template](references/brd-template.md)
- [BRD Checklist](references/checklist.md)
- [Requirements Baseline](references/standards-baseline.md)
