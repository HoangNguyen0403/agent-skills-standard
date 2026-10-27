---
description: "Map requirements, acceptance criteria, implementation, tests, and release artifacts into one traceability report."
---

# Traceability Audit Workflow

Goal: Prove every acceptance criterion has implementation and verification evidence before release or handoff.

## Steps

1. Load sources:
   - BRD-lite, PRD, SRS/FRS, AC list, implementation plan, changed files, tests, walkthrough, PR comments, release notes.
   - Jira/GitHub/GitLab/ADO/Zephyr/Confluence MCPs when configured; otherwise use exported files and local evidence.
2. Build trace map across 4 V-Model levels (`skills/quality-engineering/quality-engineering-test-plan-authoring/references/lifecycle-and-roles.md`):
   - BRD objective -> PRD requirement ID <-> Acceptance Testing (UAT/signoff).
   - PRD requirement ID -> SRS/FRS contract <-> System Testing (E2E web/mobile scenarios).
   - AC -> exact implementation file/function.
   - AC -> automated test ID, manual/Zephyr TC, or verification step <-> Integration / Unit Testing.
   - Mobile trace (Contract C6): map mobile ACs to app artifact digest/build, OS/device cells, and driver evidence.
   - Release note -> shipped user-visible change. Low-risk work uses equivalent existing evidence; four new docs not required.
3. Classify each AC & test disposition (STLC Stage 6 Closure):
   - Covered / PASS: implementation file/function exists AND fresh verification evidence verified.
   - Partial: code or verification evidence incomplete.
   - Missing: no implementation or unverified.
   - BLOCKED: missing environment, driver, or credential; listed under `missing_evidence`.
   - Deferred / Risk-Accepted: formally waived with named human owner, rationale, and expiry.
4. Flag gaps and open defects:
   - Missing requirement or V-model interface mapping.
   - Missing AC implementation (unmapped file/function).
   - Missing test or manual coverage (unmapped automated test, manual/Zephyr TC, or untested device cell).
   - Open defect ledger with severity, affected AC impact, and owner.
   - Release notes claiming unverified or unreleased capabilities.
   - Write run record to `artifacts/runs/[slug]/[compactISO]-traceability-audit.json` when file writes allowed.

## Runtime Contract
- Use pre-release or handoff to prove requirement-to-evidence coverage.
- Required inputs: PRD/SRS with AC list plus implementation, test, and release artifacts to map against.
- Return BLOCKED only when no requirement or AC list exists to trace.
## Handoff Payload
- `slug`, requirement map, gap classification, outcome report, next workflow.
## Blocking Questions
- Ask max 3 at a time with a recommended default and 2-3 options.

## Output Template

```md
# Traceability Audit

## Summary

## Requirement Map

| Requirement | SRS/FRS Contract | Implementation (File/Fn) | Verification (Test/TC) | Status |
| --- | --- | --- | --- | --- |
| [REQ] | [contract] | [file:fn] | [test/evidence] | [status] |

## Gaps

## Outcome Report
{schema_version: 1, run_id: "[run-id]", slug: "[slug]", workflow: traceability-audit, feature_status: verified, started_at: "[timestamp]", completed_at: "[timestamp]", requirement_trace: {brd_objectives: [], requirements: [], acceptance_criteria: [], srs: []}, completed_evidence: [], missing_evidence: [], decision_needed: [], recommended_next_workflow: deploy-release, cost: {source: unavailable}, agent: {identity: "[agent-identity]", model: "[model]"}}

## Next Workflow

## Cost Report
Call `get_session_cost(workflow="traceability-audit")` before final handoff.
```
