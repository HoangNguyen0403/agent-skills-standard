---
name: product-business-requirements
description: Standardize BRD and BRD-lite discovery for business goals, stakeholder impact, current-to-future state, and measurable value outcomes. Use for business analysis or elicitation results and stakeholder elicitation without requiring BRD intake.
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
      - elicitation results
      - stakeholder elicitation
---

# Business Requirements Expert

## **Priority: P0 (CRITICAL)**

Frame the business "Why" before product or technical specs.

## 1. Discovery Workflow

- For business-analysis or elicitation requests that do not require a BRD, load [Analysis Planning and Elicitation](references/analysis-planning-and-elicitation.md) directly; do not route through BRD-lite intake.
- Draft executive summary: purpose, outcome, sponsor, validation owner.
- For vague "implement X" requests, draft BRD-lite first from supplied evidence; ask at most 3 consequential blocking questions with recommended defaults per `common-decision-discipline`. Never re-ask settled decisions.
- Confirm business objective and success metric.
- Identify sponsor, decision-maker, and impacted stakeholders.
- Capture AS-IS process pain and TO-BE target state.
- Define scope boundary, exclusions, assumptions, and constraints. Carry confirmed evidence and explicit non-critical assumptions; blocking unknowns name affected slice, consequence, owner, and required input—no unowned TBD at handoff.
- Record value hypothesis: cost, revenue, risk, compliance, or cycle-time impact.
- **Handoff Quality**: Identify the **Handoff Owner** (BA Lead) and the next accountable team member (Product Manager).
- Add glossary terms when stakeholder or domain language can be misread.
- Add Mermaid AS-IS/TO-BE process diagram when workflow complexity affects approval.

## 2. BRD-lite Drafting

- Load `references/brd-template.md`.
- Keep each objective SMART: specific, measurable, achievable, relevant, and time-bound.
- Link each BRD objective to a candidate PRD requirement placeholder (`REQ-*`).
- **Offshore Ready**: Include stakeholder validation plan and acceptance window for remote delivery teams.
- Add outcome report seed: `feature_status`, `requirement_trace`, completed/missing evidence, decision needed, and recommended next workflow (`plan-feature`).
- Write to `docs/brd/brd-[slug].md`.

## 3. Quality Gate

- Every objective has an owner and KPI target.
- Every in-scope item has a rationale and out-of-scope pair.
- Risk register includes mitigation owner.
- Stakeholder approvals and unresolved decisions are explicit; consequential unknowns block only affected slices.
- Functional behavior is routed to PRD/SRS, not buried in BRD.
- Sufficiently specified low-risk ticket maintenance may proceed with an in-chat contract without mandatory BRD document detours, provided it carries an accountable owner, approved scope fence, value rationale, and verification target.

- Sensitive changes still require technical design and explicit human/governance approval per [requirements modeling §1](../product-requirements/references/requirements-modeling.md#1-applicability--sizing-gate); low-risk ticket equivalence never removes that floor.

## Anti-Patterns

- No solution design in a Why-lane BRD; Direction-lane briefs record technical options per `common-decision-discipline`.
- No vague goals ("improve efficiency") without baseline and target.
- No missing owners for objectives or risks.
- No coding or QA routing before the accountable owner, value rationale/metric, and scope fence are clear (formal document artifacts may be omitted only with approved low-risk ticket equivalence).
- No silent scope expansion after approval.
- No jargon without glossary entry.

## References

- [BRD Template](references/brd-template.md)
- [BRD Checklist](references/checklist.md)
- [Requirements Baseline](references/standards-baseline.md)
- [Analysis Planning and Elicitation](references/analysis-planning-and-elicitation.md) — load for applicable elicitation without full BRD intake.
