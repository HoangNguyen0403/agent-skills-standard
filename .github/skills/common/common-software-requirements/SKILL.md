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
- Define functional flows: trigger, inputs, validations, outputs, errors.
- For complex flows, use one actor, one goal, one session; split normal, alternate, and exception courses.
- Define interface contracts: API, events, storage, external integrations.
- Define NFR thresholds: latency, availability, security, scalability.
- Define constraints: migration, compatibility, compliance, rollout.

## 2. Drafting Workflow

- Load `references/srs-template.md`.
- **Slug Alignment**: Use the same `[slug]` from the source `docs/prd/prd-[slug].md` to maintain filename-level traceability.
- Write one requirement card per statement with stable `SRS-*` IDs.
- Map each `SRS-*` to source PRD `REQ-*` and verification lane.
- Include statement, priority, status, input/output/error behavior, NFR impact, measurement method, and evidence target.
- Write to `docs/srs/srs-[slug].md`.

## 3. Verification Mapping

- Each `SRS-*` has test evidence plan (unit/integration/E2E/manual).
- Failure modes and fallback behavior are explicit.
- Permissions and privacy controls mapped to requirements.
- Measurement method exists for each NFR.

## Anti-Patterns

- No mixed requirements and implementation tasks in same statement.
- No NFR claims without numeric threshold.
- No interface contract without input/output/error schema.
- No requirement without trace link to source and verification.
- No happy-path-only flow for complex user/system interactions.

## References

- [SRS Template](references/srs-template.md)
- [FRS Checklist](references/frs-checklist.md)
- [Requirements Baseline](references/standards-baseline.md)
