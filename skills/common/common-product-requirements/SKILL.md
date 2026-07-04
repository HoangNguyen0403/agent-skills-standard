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
- **Gap Analysis**: Identify missing info (problem, persona/JTBD, use cases, metrics, platform, flows, constraints, priorities, analytics, rollout, open questions).
- **Active Inquiry**:
- Ask 3-5 clarification questions at a time.
- **MUST** provide (a, b, c) options to reduce user friction.
- _Example_: "Target platform? a) Web b) Mobile c) Both"
- **Repeat**: Continue until `Actionable State` reached.

## 2. Drafting Phase (System of Record)

- **Filesystem**: Ensure `docs/prd/` exists.
- **Load Template**: Read `references/prd-template.md`.
- **Slug Alignment**: Use the same `[slug]` from the source `docs/brd/brd-[slug].md` to maintain filename-level traceability.
- **Fill & Fix**: Map Discovery answers to template. Mark unknowns as `TBD`.
- **Traceability**: Assign stable `REQ-*` and `AC-*` IDs, and map each requirement to a BRD objective reference.
- **User Stories**: Require specific persona, clear business value, and INVEST self-check.
- **Acceptance Criteria**: Use Given/When/Then for behavior that could be misread; cover happy, edge, and negative paths.
- **Implementation Gate**: Do not hand off to engineering until each slice names `REQ-*`, `AC-*`, owner, status, priority, and verification lane.
- **Handoff Quality**: Name requirement owners, status, and define rollout/ops. Identify whether `design-solution` is required.
- **Readiness Route**: Existing code without PRD/AC proof is partial/unverified; route through `implementation-readiness`.
- **Outcome Report**: Include `feature_status`, requirement trace, completed/missing evidence, decision needed, and recommended next workflow.
- **Living Spec**: Include analytics, risks, rollout, decisions, and changelog.
- **Output**: Write to `docs/prd/prd-[slug].md`.

## 3. Verification Checklist (Mandatory)

- [ ] **Functional**: all user flows defined?
- [ ] **Traceability**: every AC mapped to `REQ-*` and business objective?
- [ ] **Non-Functional**: Performance? Security? Offline mode?
- [ ] **Analytics/Ops**: Events, guardrails, rollout, and support readiness?
- [ ] **Tech Constraints**: DB schema impacts? API changes?
- [ ] **Edge Cases**: Zero state? Error state?
- [ ] **Scope Hygiene**: Out-of-scope items explicitly listed?

## Anti-Patterns

- **No Assumptions**: Never guess business logic. Ask.
- **No Vagueness**: "Fast" -> "Load < 200ms".
- **No Implementation**: PRD = "What", Implementation Plan = "How".
- **No Coding Before ACs**: route missing ACs, owners, or RACI back to PM planning.
- **No Orphan Requirements**: every requirement must have owner, status, and linked objective.
- **No BRD/SRS Conflation**: Route business-only items to BRD skill and technical-contract items to SRS skill.
- **No Generic Actors**: replace "user" with a specific role or persona.

## References

- [Full PRD Template](references/prd-template.md)
- [Validation Checklist](references/checklist.md)
