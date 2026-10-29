---
name: common-software-requirements
description: Standardize SRS and FRS specifications for technical behavior, interfaces, data contracts, quality constraints, and verification mapping. Use when writing SRS, functional specification, system behavior requirements, API/data contracts, or non-functional thresholds.
metadata:
  triggers:
    files:
      - "SRS.md"
      - "docs/srs/srs-*.md"
      - "specs/*.md"
    keywords:
      - create srs
      - software requirements
      - functional specification
      - system behavior spec
      - technical requirements
      - non-functional requirements
---

# Software Requirements Expert

## **Priority: P0 (CRITICAL)**

Define the technical "How" with verifiable requirements.

## 1. SRS/FRS Discovery

- Confirm linked PRD requirements (`REQ-*`) and AC IDs.
- Preserve trace: `BRD-OBJ-* -> REQ-* -> AC-* -> SRS-* -> test evidence`.
- **Delivery Mode**: Carry `delivery_mode` separately from `snc_tier`. `brief` (approved low-risk, nonsensitive work with outcome, scope fence, owner, observable criteria, approval reference, verification lane) uses the ticket/session record and writes no SRS. `standard` writes this focused SRS only when technical decisions or contracts need an explicit design; `extended` adds risk-triggered contracts, migration, capacity, or failure analysis. Missing mode is a routing decision from approved evidence and risk, never automatic permission to skip design.
- **Conditional Sections**: Fill the core; add an extension only when its trigger applies. Omit irrelevant sections instead of writing "none" paragraphs; omitting an applicable extension is an owned blocker.
- Missing behavioral acceptance criteria, accountable owner, consequential design approval, or verification prerequisites route EVERY affected slice back to requirements/planning regardless of new or existing scope. Bounded low-risk equivalence (approved ticket with behavioral AC, owner, scope fence, approval, verification lane) may replace separate SRS files and formal IDs, but never waives behavioral prerequisites; do not infer product scope from code.

- Sensitive changes require technical design and explicit human/governance approval per [requirements modeling §1](../../product-management/product-requirements/references/requirements-modeling.md#1-applicability--sizing-gate); low-risk equivalence never removes that floor.
- Define functional flows: trigger, inputs, validations, outputs, errors.
- For complex flows, use one actor, one goal, one session; split normal, alternate, and exception courses.
- Define interface contracts: API, events, storage, external integrations.
- Define NFRs: numeric thresholds where appropriate (latency, availability, scalability) and categorical verifiable invariants where appropriate (security, access control, integrity); never fabricate numbers.
- Define constraints: migration, compatibility, compliance, rollout.


- Consume the canonical conflict, requirement-quality-versus-need-validation, and temporary-transition distinctions in [shared requirements modeling](../../product-management/product-requirements/references/requirements-modeling.md#7-conflict-validation-and-transition-needs). Keep technical migration/rollback realization in SRS; do not duplicate the shared business-analysis rules.
## 2. Drafting Workflow

- Load `references/srs-template.md`.
- **Decision First**: Open with the decision brief (changes since approved revision, recommendation, impact if wrong, evidence and limitations, unresolved decision with owner and affected slice, exact approval sought, independently ready slices), then the architecture/contract delta against the existing baseline.
- **Slug Alignment**: Use the same `[slug]` from the source `docs/prd/prd-[slug].md` to maintain filename-level traceability.
- Write one requirement card per statement with stable `SRS-*` IDs, linking source `REQ-*`/`AC-*`, behavior, failure/fallback, NFR or security impact, and verification.
- Link API/schema/ADR details instead of restating them; omit an inapplicable extension rather than padding it.
- Add outcome report outside the human SRS: `feature_status`, requirement trace, completed/missing evidence, decision needed, and recommended next workflow; the human document links the persisted run record.
- Write to `docs/srs/srs-[slug].md`.

## 3. Verification Mapping

- Each requirement card carries exactly one authoritative verification mapping: lane plus evidence artifact. Do not add a second matrix or repeat the mapping in trace tables.
- Failure modes and fallback behavior are explicit.
- Permissions and privacy controls mapped to requirements as verifiable categorical invariants.
- Measurement or verification method exists for each NFR.

## Anti-Patterns

- No mixed requirements and implementation tasks in same statement.
- No NFR claims without verifiable criteria: use numeric thresholds where appropriate, categorical invariants for security/access; never fabricate numbers.
- No interface contract without input/output/error schema.
- No requirement without trace link to source and verification.
- No implementation handoff without behavioral ACs and verification lanes mapped to each slice; formal PRD/SRS IDs and separate documents may be replaced only by approved low-risk ticket equivalence (carrying behavioral AC, owner, approval, scope fence, verification lane).
- No happy-path-only flow for complex user/system interactions.
- No duplicate specification: one definition per requirement, AC, and verification mapping.
- No brief-mode escape from a sensitive-change design or human gate.

## References

- [SRS Template](references/srs-template.md)
- [FRS Checklist](references/frs-checklist.md)
- [Requirements Baseline](references/standards-baseline.md)
