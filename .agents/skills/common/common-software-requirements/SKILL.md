---
name: common-software-requirements
description: Standardize SRS and FRS specifications for technical behavior, interfaces, data contracts, quality constraints, and verification mapping. Use when writing SRS, functional specification, system behavior requirements, API/data contracts, or non-functional thresholds.
metadata:
  triggers:
    files:
    - 'SRS.md'
    - 'docs/specs/srs-*.md'
    - 'specs/*.md'
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
- Define functional flows: trigger, inputs, validations, outputs, errors.
- Define interface contracts: API, events, storage, external integrations.
- Define NFR thresholds: latency, availability, security, scalability.
- Define constraints: migration, compatibility, compliance, rollout.

## 2. Drafting Workflow

- Load `references/srs-template.md`.
- Write one requirement per statement with stable `SRS-*` IDs.
- Map each `SRS-*` to source PRD `REQ-*` and verification lane.
- Write to `docs/specs/srs-[slug].md`.

## 3. Verification Mapping

- Each `SRS-*` has test evidence plan (unit/integration/E2E/manual).
- Failure modes and fallback behavior are explicit.
- Permissions and privacy controls mapped to requirements.

## Anti-Patterns

- No mixed requirements and implementation tasks in same statement.
- No NFR claims without numeric threshold.
- No interface contract without input/output/error schema.
- No requirement without trace link to source and verification.

## References

- [SRS Template](references/srs-template.md)
- [FRS Checklist](references/frs-checklist.md)
- [Requirements Baseline](references/standards-baseline.md)
