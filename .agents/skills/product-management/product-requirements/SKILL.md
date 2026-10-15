---
name: product-requirements
description: Standardize PRD discovery and drafting for product scope, user outcomes, requirement IDs, and acceptance criteria. Use when creating PRD, product requirements, feature specification, or acceptance criteria plan.
metadata:
  triggers:
    files:
      - "PRD.md"
      - "docs/prd/prd-*.md"
      - "specs/*.md"
    keywords:
      - create prd
      - product requirements
      - draft requirements
      - new feature spec
      - acceptance criteria
---

# Product Requirements Expert

## **Priority: P0 (CRITICAL)**

**Role**: PM-owned product spec owner. Define the product "What" before technical design or implementation.

## 1. Discovery Phase (Iterative)

- **Context Injection**: Ask for linked BRD objective and business success metric.
- **Scope Gate**: For substantial scope, load [requirements modeling](references/requirements-modeling.md) for decomposition stop rules and completeness review; each in-scope leaf maps to a `REQ-*`/`AC-*` or owned gap.
- **Question Discipline**: Draft from supplied evidence; ask at most 3 consequential questions per round (`common-decision-discipline`) with recommended defaults and 2–3 concrete options. Never re-ask settled facts.

## 2. Drafting Phase (System of Record)

- **Filesystem**: Ensure `docs/prd/` exists. Write spec to `docs/prd/prd-[slug].md` preserving slug from `docs/brd/brd-[slug].md`.
- **Templates & References**: Read `references/prd-template.md`. Load `references/requirements-modeling.md` on-demand for scope trees, decision tables, state/lifecycle, and change impact.
- **Unknowns Classification**: Carry confirmed evidence (`confirmed(<source>)`) and explicit non-critical assumptions (`assumed(<hypothesis>)`). Blocking decisions (`blocked(<slice>, <owner>, <input>)`) name affected slice, consequence, owner, and required input—no unowned TBD at handoff.
- **Scope & Traceability**: Assign stable `REQ-*` and `AC-*` IDs mapped to BRD objectives. Every in-scope leaf links to REQ/AC or an owned gap (`gap(<id>, <owner>, <input>)`). Define shared rules/functions canonically once; flows reference by ID/name without duplicate definitions.
- **User Stories & ACs**: Require specific persona, business value, and INVEST check. Use Given/When/Then for one observable behavior per AC across happy, edge, and negative paths; multiple preconditions are permitted. Interacting conditions use truth tables and owner decisions rather than silently selecting policy.
- **View Selection**: Choose a view that answers the open scope, behavior, or dependency question; use the shared requirements-modeling reference on demand. Diagrams remain optional when prose or tables are precise.
- **Implementation Gate & Readiness**: Engineering handoff requires behavioral AC, accountable owner, priority, and verification lane per slice. Unverified code routes to `implementation-readiness`. Bounded low-risk equivalence (approved ticket with behavioral AC, accountable owner, scope fence, approval, verification lane) satisfies readiness without separate documents; sensitive changes still require technical design and explicit human/governance approval per [requirements modeling §1](references/requirements-modeling.md#1-applicability--sizing-gate).
- **Change Impact**: When requirements change, trace affected ACs, downstream contracts, approvals, and verification evidence carrying existing IDs without reopening settled decisions.
- **Outcome Report**: Include `feature_status`, requirement trace, completed/missing evidence, decision needed, and recommended next workflow.

## 3. Verification Checklist (Mandatory)

- [ ] **Functional & Scope**: all user flows defined? Capabilities classified (in_scope/deferred/excluded)? Omitted capabilities raised for explicit disposition?
- [ ] **Canonical Definitions**: shared rules/functions defined once and referenced across flows?
- [ ] **Traceability**: every AC mapped to `REQ-*` and business objective?
- [ ] **Non-Functional**: Performance? Security? Offline mode? (Numeric thresholds where appropriate, verifiable categorical invariants for security/access; never fabricate numbers).
- [ ] **Analytics/Ops**: Events, guardrails, rollout, and support readiness?
- [ ] **Tech Constraints**: DB schema impacts? API changes?
- [ ] **Edge Cases**: Zero state? Error state? Consequential undefined states block only affected slices with named owner.
- [ ] **Scope Hygiene**: Out-of-scope items explicitly listed?

## Anti-Patterns

- **No Unowned Unknowns or Hidden Assumptions**: Carry confirmed evidence and explicit non-critical assumptions. Do not restart intake unconditionally; blocking unknowns must name affected slice, consequence, owner, and required input.
- **No Vagueness**: Numeric NFR thresholds where appropriate ("Load < 200ms"); categorical verifiable invariants for security/access; never fabricate numbers.
- **No Implementation**: PRD = "What", Implementation Plan = "How".
- **No Coding Before ACs**: Missing behavioral AC, accountable owner, or verification lane routes back to PM planning for every affected slice; approved low-risk tickets may replace separate documents and formal IDs, but never waive behavioral AC, owner, approval, scope fence, or verification lane.
- **Offshore handoff**: Explicitly include role accountability (PM/BA/Engineering/QA RACI or confirmed low-risk ticket owner/approval) and name the validation owner before development starts.
- **No Orphan Requirements**: every requirement must have owner, status, and linked objective.
- **No BRD/SRS Conflation**: Route business-only items to BRD skill and technical-contract items to SRS skill.
- **No Generic Actors**: replace "user" with a specific role or persona.
- **No Silent Omission or Invention**: Missing domain capabilities must be raised as explicit scope decisions; never invent production policies.

## References

- [Full PRD Template](references/prd-template.md)
- [Requirements Modeling](references/requirements-modeling.md)
- [Validation Checklist](references/checklist.md)
- [Requirements Baseline](../../common/common-software-requirements/references/requirements-standards-baseline.md)

## Ownership checklist

- Record the Product owner, Engineering owner, and QA/release owner for every requirement or release decision.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:

- Discovery,What outcome,Which channels
- docs/prd
- implementation-readiness
