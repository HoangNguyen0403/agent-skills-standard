# Slice W — Canonical workflow routing implementation report

Status: authored canonical workflow routing updates; ready for parent integration. Repository workflow changes only; no live lab, paid model evaluation, release or policy bypass.

## Owned artifacts and line counts

| File | Lines | Rule limit | Status |
| --- | --- | --- | --- |
| `.agents/workflows/cyber-exercise.md` | 60 | <= 80 lines | Updated (mode routing, step isolation, continuation) |
| `.agents/workflows/cyber-purple-validation.md` | 47 | <= 80 lines | Updated (mode routing, replay fidelity, paired gate, continuation) |
| `.agents/workflows/cyber-triage.md` | 44 | <= 80 lines | Updated (optional lab retest handoff, gated containment, continuation) |
| `.agents/workflows/pentest.md` | 50 | <= 80 lines | Updated (optional scoped lab handoff in exploit verification) |
| `.agent/sdd/prd-cyber-lab-validation/workflows-implementation-report.md` | — | — | This report |

All owned workflow files strictly adhere to `common-workflow-writing` (limit: 80 lines, no table example data, imperative steps, portable output contracts).

## Read-only audit: `.agents/workflows/security-test.md`

- **Observed state**: 51 lines. Fast (< 2 mins) DevSecOps pipeline for PRs and active branches focusing on SAST, SCA, and secrets detection.
- **Contract check**: Explicitly declares "No dynamic exploitation required." Uses read-only analyzers and static review delegates (`specialist-aspm-correlator`, `specialist-security-reviewer`).
- **Audit finding**: Aligns with SRS E06 and Section 10 ("No active routing required: existing static delta and design gate adequate; leave behavior unchanged unless demonstrated contract mismatch").
- **Disposition**: Zero contract mismatch. Left completely unchanged as instructed.

## Acceptance accounting and requirement trace

| Requirement / AC | Design trace | Implementation in Slice W |
| --- | --- | --- |
| **REQ-CLV-01** (SRS-CLV-01 / CMP-ROUTE) | Mode selection (`analysis`, `replay`, `isolated-lab-validation`, `defensive-verification`) without conflating evidence | Added explicit 4-mode routing across `cyber-exercise.md` (Step 5), `cyber-purple-validation.md` (Steps 1 & 3), and `cyber-triage.md` (Step 1). Replay fidelity explicitly isolates pipeline stages actually exercised from sensor detection/prevention claims. |
| **REQ-CLV-04** (SRS-CLV-04 / CMP-ROUTE) | Isolate blocked predecessors; continue independent permitted tasks | In `cyber-exercise.md` (Step 6), `cyber-purple-validation.md` (Step 4), and `cyber-triage.md` (Step 6), blocked steps are isolated (`step_state: blocked \| stopped \| failed`). Missing predecessor evidence explicitly marks downstream dependent tasks `dependency-blocked` with `block_reason: evidence-missing`. Independent permitted work (remediation, rule drafting, analysis, reporting) proceeds without disguised retries or fabricated inputs. |
| **AC-CLV-01** / VER-CLV-01 | Source review completes without live-host requirement | `analysis` mode routes to `cyber-scoped-validation` and offline inspection without live-execution prerequisites. |
| **AC-CLV-02** / VER-CLV-02 | Telemetry replay reports only exercised pipeline stages | `replay` mode routes to `cyber-detection-validation`, reporting only pipeline stages exercised (e.g. parser, correlation) without inferring sensor efficacy or prevention. |
| **AC-CLV-09** / VER-CLV-09 | Independent remediation despite blocked/refused action | If active validation is blocked or refused, remediation guidance, detection rule updates, and reporting proceed directly. |
| **AC-CLV-10** / VER-CLV-10 | Missing producer evidence dependency-blocks consumer | Downstream validation tasks depending on unexecuted active steps are marked `dependency-blocked` (`evidence-missing`), preventing fabricated observations. |
| **Optional Lab Handoff** (E05, E06, Section 10) | Bounded lab handoff without expanding permissions | `pentest.md` (Step 4) adds optional scoped lab handoff to `cyber-lab-validation` for synthetic lab targets under verified host isolation while keeping existing PTES structure, Hacker Report, and operational prohibitions unchanged. |

## Exact file change details

1. `.agents/workflows/cyber-exercise.md`:
   - Updated frontmatter description and goal to cover multi-mode exercise and optional isolated lab validation.
   - Refined Preflight (Step 3) to mark active steps `blocked` when runtime support is absent.
   - Replaced single validation route with 4-mode routing (Step 5): `analysis` (`cyber-scoped-validation`), `replay` (`cyber-detection-validation`), `isolated-lab-validation` (`cyber-lab-validation`), `defensive-verification` (`cyber-detection-validation` under active effects gate).
   - Added Step 6 (Isolate and Continue): sets `dependency-blocked` (`evidence-missing`) on dependent steps; continues independent remediation/reporting.
   - Updated handoff payload and output template to capture mode and per-step dispositions (`step_state`, `block_reason`).

2. `.agents/workflows/cyber-purple-validation.md`:
   - Updated description and runtime contract to include optional `cyber-lab-validation`.
   - Step 1: added mode classification (`analysis`, `replay`, `isolated-lab-validation`, `defensive-verification`).
   - Step 3: explicit execution/routing paths per mode; replay stage isolation.
   - Step 4: isolation of blocked steps, `dependency-blocked` marking for downstream verification, and independent rule tuning/remediation continuation.
   - Step 5 & 6: preserved paired correlation `(run_id, attempt_id, test_id)` and defensive outcome classification (`blocked`, `prevented`, `detected`, `responded`, `telemetry-gap`).

3. `.agents/workflows/cyber-triage.md`:
   - Updated description, goal, and runtime contract to acknowledge optional isolated lab retest handoff.
   - Step 1: explicit `analysis` mode for intake and initial triage.
   - Step 4: added optional lab retest handoff to `cyber-lab-validation` on disposable synthetic fixtures under verified host isolation; production targets strictly excluded.
   - Step 5: gated containment with explicit block reasons (`authorization-missing`, `policy-refused`).
   - Step 6: isolation of blocked containment actions, setting dependent steps to `dependency-blocked` (`evidence-missing`) while independent analysis, timeline reconstruction, and remediation advice continue.

4. `.agents/workflows/pentest.md`:
   - Step 4 (Exploit verification): added optional scoped lab handoff to `cyber-lab-validation` for isolated synthetic lab targets with action-specific authorization and host isolation controls.
   - Retained strict prohibitions against targeting production/public assets, using real credentials, or exfiltrating data.
   - If exploit verification is blocked or refused, records step `blocked` / finding `not-tested` and continues independent threat modeling, code review, and remediation guidance without disguised prompt retries.
   - Preserved PTES workflow structure, Hacker Score, and findings table.

## Checks actually performed and planned for parent integration

- **Checks performed**:
  - Read full AGENTS.md, implementation brief, relevant PRD sections, and SRS contracts (E01–E10, SRS-CLV-01–07, LLD-ROUTE, LLD-GATE, LLD-EVIDENCE, Section 10).
  - Verified line counts: all 4 workflows are under 60 lines (well within the 80-line limit).
  - Verified output templates: all contain portable output contract fields (`feature_status`, `completed_evidence`, `missing_evidence`, `decision_needed`, `recommended_next_workflow`).
  - Audited `security-test.md`: confirmed static delta nature, left untouched.
  - Skipped builds, tests, lint, formatters, and generators mid-flight per brief instructions.
  - Zero edits to skill sources, mirrors, metadata, or indexes.

- **Recommended verification checks for parent**:
  - Read-only structural verification across the 4 modified workflow files.
  - Ensure references to `cyber-lab-validation` match the package structure authored by Slice C.

## Unresolved risks and boundaries

1. **Dormant activation**: Workflow definitions provide procedural structure and agent routing; they do not grant host runtime permissions.
2. **G3 host proof dependency**: Lab validation routes remain blocked (`unsupported-runtime`) until an authorized lab host demonstrates isolation, tool allowlists, and cancellation controls.
3. **Model compatibility**: Routing workflows do not alter model safety filters or provider refusal behavior; blocked steps are safely isolated to prevent infinite retry loops.

## Handoff

- `slug`: `cyber-lab-validation`
- `slice`: `Slice W — Canonical workflow routing`
- `feature_status`: `implemented` (for Slice W repository routing scope; activation remains gated by G3/G4/G5)
- `recommended_next_workflow`: parent integration and validation
