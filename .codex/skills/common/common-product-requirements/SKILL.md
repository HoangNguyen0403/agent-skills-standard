---
name: common-product-requirements
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
- **Gap Analysis**: Identify missing info. For substantial scope, build a verb-object scope tree (one containment parent; leaves: `in_scope`, `deferred`, `excluded`). Stop decomposition when actor, trigger, intended result, rules/exceptions, boundary, and verification permit estimation and assignment.
- **Question Discipline**:
  - Draft first from supplied evidence; ask at most 3 consequential questions per round per `common-decision-discipline`.
  - Provide recommended defaults and 2–3 concrete options to reduce user friction.
  - Never re-ask settled decisions or facts.

## 2. Drafting Phase (System of Record)

- **Filesystem**: Ensure `docs/prd/` exists.
- **Load Template & Modeling**: Read `references/prd-template.md`. For substantial scope, load `references/requirements-modeling.md`.
- **Slug Alignment**: Use the same `[slug]` from the source `docs/brd/brd-[slug].md` to maintain filename-level traceability.
- **Fill & Evidence**: Map discovery answers to template. Carry confirmed evidence and explicit non-critical assumptions; blocking unknowns name affected slice, consequence, owner, and required input—no unowned TBD at handoff.
- **Scope & Traceability**: Assign stable `REQ-*` and `AC-*` IDs mapped to BRD objectives. Every in-scope leaf links to REQ/AC or a named gap (`gap(<id>, <owner>, <input>)`). Define shared rules/functions canonically once and reference across flows without duplicate definitions.
- **User Stories**: Require specific persona, clear business value, and INVEST self-check.
- **Acceptance Criteria**: Use Given/When/Then for one observable behavior per AC across happy, edge, and negative paths; multiple necessary preconditions are permitted (do not split solely on 'And'). Interacting conditions use truth tables and owner decisions rather than selecting business policy silently.
- **View Selection**: Select views by question: scope tree=capabilities; process flow=order/responsibilities; decision table=rules; state=lifecycle; sequence=interactions; delivery graph=work prerequisites. Diagrams optional when prose/tables suffice; reuse existing C4/state/sequence specs or Mermaid.
- **Implementation Gate**: Do not hand off to engineering until each slice names behavioral AC, accountable owner, priority, and verification lane (using formal REQ-*/AC-* IDs or confirmed low-risk ticket equivalence).
- **Handoff Quality & Change Impact**: Name requirement owners, status, rollout/ops. When requirements change, trace affected ACs/contracts/approvals/evidence carrying existing IDs; do not reopen settled decisions.
- **Readiness Route**: Existing code without behavioral AC proof is partial/unverified; route through `implementation-readiness`. Bounded low-risk equivalence (approved ticket with behavioral AC, accountable owner, scope fence, approval, and verification lane) may replace separate PRD files and formal IDs; retain sensitive approval floors and slice-level PARTIAL boundaries.
- **Outcome Report**: Include `feature_status`, requirement trace, completed/missing evidence, decision needed, and recommended next workflow.
- **Living Spec**: Include analytics, risks, rollout, decisions, and changelog.
- **Output**: Write to `docs/prd/prd-[slug].md`.

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
- [Requirements Baseline](../common-software-requirements/references/requirements-standards-baseline.md)

## Ownership checklist

- Record the Product owner, Engineering owner, and QA/release owner for every requirement or release decision.

## Canonical response anchors

When this skill applies, preserve the following domain terminology or equivalent concrete examples in the answer when relevant:
- Discovery,What outcome,Which channels
- docs/prd
- implementation-readiness
