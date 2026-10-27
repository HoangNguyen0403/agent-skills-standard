# Task 1 Report: Shared Creative Production Contract

**Date**: 2026-10-26  
**Workspace**: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/creative-production-improvements`  
**Base Commit**: `1aecf6c3f3b49c01b2d66cd3afac856d29cc538d`  
**Target File**: `skills/marketing/marketing-content-strategy/references/creative-production-contract.md`  
**Report Path**: `.superpowers/sdd/creative-production-improvements/task-1-report.md`  

---

## 1. Overview & Scope Compliance

Per task brief instructions, Task 1 established the canonical shared reference for creative production governance across `marketing-content-strategy`, `marketing-copywriting`, and `marketing-demo-video`.

- **Owned Path**: `skills/marketing/marketing-content-strategy/references/creative-production-contract.md` (created).
- **Report Path**: `.superpowers/sdd/creative-production-improvements/task-1-report.md` (created).
- **Untouched Components**: No changes were made to skill cores (`SKILL.md`), schemas (`demo-storyboard.schema.json`), validation scripts (`validate-demo-storyboard.mjs`), evals (`evals.json`), or generated mirrors.
- **Workflow Constraints**: No test, build, lint, or formatter commands were executed mid-flight, honoring the constraint that covering checks run after all source writers settle. No subagents delegated.

---

## 2. Vocabulary & Semantics Field Mapping

The contract integrates with and preserves existing registry conventions across marketing and video domains:

| Existing Field / Vocabulary | Context / Origin | Shared Contract Mapping (C1–C6) | Semantics & Role in Contract |
|---|---|---|---|
| `asset_id` | Brand / Media assets | C1, C2 | Stable, immutable identifier for approved brand logos, fonts, palettes, and media inputs. |
| `context_revision` | `marketing-content-strategy`, `copywriting` | C1, C2, C3 | Traceability token linking assets to a campaign snapshot. Documented: *lineage token, not authenticated human approval*. |
| `channel.format` | `content-mapping.md` | C1, C5 | Deliverable target (e.g. `hero_banner`, `pinterest_graphic`, `terminal_walkthrough`). Determines production pipeline and format constraints. |
| `action.primary_cta` | `content-mapping.md` | C1, C2 | Canonical location for observable reader action. Brief's `exact_copy.primary_cta` supplies the verbatim text payload while preserving `action.primary_cta` semantics. |
| `proof_bindings` (`claim_refs`, `source_refs`) | `marketing-copywriting`, `marketing-proof` | C1, C5 | Grounding factual claims in approved evidence registers (`docs/product/*/evidence.json`). |
| `scene-XX` (`scene_id`) | `demo-storyboard.schema.json` | C3, C4 | Sequential scene identification in production manifests (`scene-01`, `scene-02`, etc.). |
| `dependency_asset_ids` | *New shared field* | C2 | Explicit list of input `asset_id` tokens an output relies upon for selective invalidation. |
| `consumed_revisions` | *New review field* | C2 | Mapping of each consumed dependency `asset_id` to its exact revision during production. |
| `state: "prepared"`, `action: "propose"` | `editorial-governance.md` | C1, C5 | Default lifecycle state preventing unauthorized auto-publication. |

---

## 3. C1–C6 Contract Implementation Summary

1. **C1 — Creative Brief**: Formalized brief intake structure (`brief_id`, `context_revision`, `channel`, `creative_direction`, `rights_context`, `exact_copy`, `proof_bindings`, `supplied_assets`, `permitted_operations`). Established brief re-ask minimization (AC-04), consequential gap reporting for missing direction/rights, and operation-specific boundaries (AC-12: distinct authorizations for tool installs, media uploads, spend caps, and public publishing). Real authority is explicitly distinguished from document/JSON input assertions.
2. **C2 — Brand Lock & Selective Invalidation**: Output artifacts declare `dependency_asset_ids` and `consumed_revisions`. Established selective invalidation transition rules (AC-01, AC-02) and an explicit multi-state counterexample proving that updating an unreferenced palette token strictly preserves the exact prior states (`prepared`, `authorized`, `rejected`, `stale`) of unaffected assets without promoting anything to `authorized` or `accepted`.
3. **C3 — Scene Manifest & Audio-Video Pairing**: Specified a standalone production review manifest distinct from the closed storyboard JSON (`demo-storyboard.schema.json`). Mandated 1:1 audio-visual pairing, scene identity matching, rejection of cross-scene asset reuse or swapped pairs (AC-05), delivery of assembled artifacts rather than loose clips (AC-06), honest reporting of missing assembler/renderer capabilities (AC-07), and avoidance of vendor-locked clip lengths or model parameters.
4. **C4 — Recovery, Rejoin, & Selective Repair**: Defined timeout rejoin protocol (AC-08: timeout $\ne$ failure; retain `job_id`, query status before duplicate re-submission). Mandated selective repair retaining accepted assets in their prior state when one scene or output fails (AC-09).
5. **C5 — Delivery, QA, & Fact Classification**: Established a 7-category fact classification table (`requested`, `produced`, `measured`, `visually_reviewed`, `approved`, `stale`, `unavailable`). Enforced separation between deterministic proof and visual plausibility (AC-10), decoupling source markdown diffs from rendered copy/font fidelity, honest disclosure of editable source file and custom font limitations (AC-11), and mandatory synchronized captions (WebVTT baseline, SRT auxiliary only) and transcripts.
6. **C6 — Safety, Provenance, & Boundary Governance**: Established that external design references and text prompts are untrusted input data (AC-14). Mandated that third-party vendor scores be labeled synthetic predictions rather than observed conversions or ROI (AC-13). Grounded demo recordings in real repository code.

---

## 4. Review-Only Scenario Examples

### Scenario 1: Selective Invalidation Counterexample Across Multiple States (AC-01, AC-02)
- **Setup**: Campaign defines approved assets: `asset-logo-primary` (v1.2), `asset-palette-core` (v2.0), and `asset-palette-accent-cyan` (v1.0).
- **Outputs**:
  - `out-banner-01`: `authorized`, depends on `["asset-logo-primary", "asset-palette-core", "asset-palette-accent-cyan"]`.
  - `out-logo-mono`: `authorized`, depends on `["asset-logo-primary"]`.
  - `out-poster-draft`: `prepared`, depends on `["asset-logo-primary"]`.
  - `out-clip-failed`: `rejected`, depends on `["asset-logo-primary"]`.
  - `out-legacy-tag`: `stale`, depends on `["asset-font-inter"]`.
- **Event**: Brand designer updates `asset-palette-accent-cyan` to v1.1.
- **Evaluation**:
  - `out-banner-01` references `asset-palette-accent-cyan` $\to$ transitions to `state: "stale"`.
  - `out-logo-mono` does NOT reference `asset-palette-accent-cyan` $\to$ **retains prior state `authorized`**.
  - `out-poster-draft` does NOT reference `asset-palette-accent-cyan` $\to$ **retains prior state `prepared`** (not promoted).
  - `out-clip-failed` does NOT reference `asset-palette-accent-cyan` $\to$ **retains prior state `rejected`** (not promoted).
  - `out-legacy-tag` does NOT reference `asset-palette-accent-cyan` $\to$ **retains prior state `stale`** (not promoted).
  - **Result**: Preserves unaffected assets in exact prior states without blanket invalidation or unauthorized promotion.

### Scenario 2: Audio-Video Pairing, Swapped Asset Rejection, & Capability Gap (AC-05, AC-07)
- **Setup**: Video walkthrough planned with 2 scenes (`scene-01`, `scene-02`).
- **Condition A (Swapped Audio / Cross-Scene Reuse)**: `scene-01` references `audio/scene-02.wav` and `scene-02` also references `audio/scene-02.wav`.
  - **Evaluation**: Gate evaluates manifest. Detects cross-scene mismatch on `scene-01` and duplicate asset reuse across scenes. Assembly is **BLOCKED** with offending IDs: `assembly_blocked: ["scene-01", "scene-02"]`.
- **Condition B (Renderer Unavailable)**: All scenes are paired, distinct, and accepted, but the execution environment lacks `ffmpeg` or an authorized video assembler.
  - **Evaluation**: Agent emits `assembly_status: "unavailable"` and outputs the production review manifest with explicit capability gap disclosure. Does not fake or invent a final `.mp4` file.

### Scenario 3: Transient Timeout Rejoin & Selective Repair (AC-08, AC-09)
- **Setup**: Long video rendering job `job-render-8821` times out after 120s.
- **Evaluation**:
  - Agent sets status to `pending_rejoin` and queries provider status endpoint `GET /jobs/job-render-8821` instead of immediately re-submitting a duplicate job.
  - If job succeeded remotely, artifact is retrieved.
  - If QA reveals `scene-03` has distorted audio while `scene-01` and `scene-02` pass QA, agent retains `scene-01` and `scene-02` in prior state and triggers targeted re-render only for `scene-03`.

---

## 5. Preserved Behaviors & Safeguards

1. **Closed Storyboard Schema Intact**: `demo-storyboard.schema.json` remains strictly closed (`additionalProperties: false`). The new production manifest is kept as a separate document, preventing schema validation breakage.
2. **Independent Tooling Unaffected**: Existing CLI verification (`validate-demo-storyboard.mjs`) and local capture recipes run without dependencies on the new contract.
3. **Spend & Provenance Discipline**: Zero mandatory media fees path, hard spend caps, and DEC authorization string assertions remain intact.

---

## 6. Risks & Consumer Integration Guidance

1. **Resolution Failure Risk**: If downstream packages fail to resolve the shared contract, they must emit `capability_gap: "missing_creative_production_contract"` and halt creative-production claims rather than attempting unapproved package installation.
2. **Guidance vs Enforcement**: This contract provides normative procedural rules for agents. It does not introduce a runtime daemon or database engine. Review and verification rely on agent compliance and evaluation suites.

---

## 7. Review Findings Correction Report (Follow-Up)

Following independent review (`task-1-review.md`, verdict: CHANGES REQUESTED), the following six Major findings and quality observations were resolved in `skills/marketing/marketing-content-strategy/references/creative-production-contract.md`:

| Finding | Severity | Resolution Summary | Location in Contract |
|---|---|---|---|
| **R1: Invalidation Promotes Outputs to Accepted** | MAJOR | Rewrote Step 3 of invalidation rules: outputs not depending on revised assets strictly preserve their exact prior state (`prepared`, `authorized`, `rejected`, or `stale`). Expanded transition table with 4 distinct counterexamples proving non-promotion across varied states. | Section 3.3, 3.4 |
| **R2: Unbound Acceptance & Dependency Records** | MAJOR | Defined revision-bound production review records explicitly capturing `output_id`, `output_revision`, `consumed_revisions` mapping (`asset_id` $\to$ revision consumed), `approval_ref` with revision scope, and production QA/job/style references. Distinguished review guidance from public schema/enum and closed storyboard JSON. | Section 3.2 |
| **R3: Assembly Gate Permits Mismatched/Reordered Pairs** | MAJOR | Enhanced assembly gate rules: mandated scene identity matching, prohibited duplicate cross-scene asset reuse, required sequential assembly alignment, and mandated timing evidence check. Added negative counterexample (`pman-invalid-sample`) demonstrating blocked assembly with offending scene IDs. | Section 4.3, 4.4 |
| **R4: Brief Omits Direction/Rights/Proof & CTA Mapping** | MAJOR | Updated brief contract to require `creative_direction`, `rights_context`, and `proof_bindings`. Explicitly mapped `action.primary_cta` from `content-mapping.md` to `exact_copy.primary_cta`. Mandated consequential gap reporting for missing direction or rights clearance. | Section 2.1, 2.3, 2.4 |
| **R5: Spend Assertion Without Real Authority Distinction** | MAJOR | Explicitly documented that `authorization: "DEC-xxx"`, `assets_cleared: true`, and `permitted_operations` are untrusted input assertions in documents/JSON, NOT authenticated runtime authority. Reaffirmed hard spend caps, runtime human authorization requirements, and immediate STOP conditions. | Section 2.5 |
| **R6: Source Diff Overclaimed as Rendered Fidelity** | MAJOR | Decoupled source markdown diffs from rendered copy and font fidelity. Mandated measurable optical/ffprobe verification on the delivered artifact for exact text, font metrics, contrast, and timing claims. Prohibited overclaiming source diffs as rendered proof; mandated `unverified` classification when tooling lacks rendered inspection capabilities. | Section 6.2 |
| **Observation: Synthetic Guidance Labeling** | Observation | Added explicit top-level and section-level notices that all JSON examples are synthetic illustrative guidance, not executed deliverables, not real sign-offs, not a public schema, and not enforced by the closed storyboard validator. | Frontmatter / Header, Sec 3.2, 4.1 |
| **Observation: Baseline WebVTT Preservation** | Observation | Reaffirmed WebVTT (`.vtt`) as the mandatory baseline per `marketing-demo-video`. Designated SRT as an optional auxiliary export only, never a replacement. | Section 6.4 |
| **Observation: Immutable Upstream Source URLs** | Observation | Added immutable GitHub tree URLs to pinned commit `f83af0bc1d937c8119099a11f8ebbf5e6fb99819` for both `higgsfield-brandkit` and `higgsfield-video-explainer`. | Header |

**Verification & Gate Status**:
- No test, build, lint, or formatter commands were run mid-flight, per worker restrictions.
- Only the two authorized files (`creative-production-contract.md` and `task-1-report.md`) were updated.
- No subagents spawned; no delegation.

---

## 8. Second Scoped Correction (RR1–RR4) — Supersedes §7 Claims Where Noted

Scope: only the two owned files. Source snapshot before this pass: contract 320 lines; corrected contract is 357 lines. No tests/build/lint/formatters, no provider calls, no installs, no delegation. Line numbers refer to the corrected contract; §9 references the current 376-line snapshot.

| Finding | Severity | Change | Evidence (corrected contract) |
|---|---|---|---|
| **RR1a** Narration inputs no longer explicitly required | MAJOR | Restored an explicit requirement that every narrated scene supply a resolvable audio ref, visual clip ref, and caption cue ref; missing/empty/unresolvable input blocks that scene. Offending IDs and reasons are mandatory gate output. | L225 (invariant 1), L230 (invariant 6) |
| **RR1b** Scene-ID uniqueness conflated with order uniqueness | MAJOR | Split identity from ordering: `scene_id` MUST be unique even when orders differ; `order` MUST be unique, sequential, monotonic, gap-free, and aligned with narration-cue/assembly timeline. Negative gate evaluation now lists `duplicate_scene_id` and `order_mismatch`. | L226, L259–L260 |
| **RR1c** Completion no longer required per-scene approval | MAJOR | Added approval/readiness prerequisite: current `scene_approval_ref` bound to consumed media revisions; missing, revision-mismatched, `rejected`, or `stale` scenes block delivery even when pairing is valid. Delivery sentence now requires input, identity, order, assignment, declared-timing, and approval checks. | L229 (invariant 5), L282 (4.6) |
| **RR2** Universal ban on shared audio/visual files | MAJOR | Replaced "no asset reuse" with scene-specific assignment semantics: shared **source files** are valid when each scene declares and verifies its binding/role (trim start/end, cue offset, hold). Superseded in §9: the residual rejection of identical ranges was removed there. | L227 (invariant 3), L232–L262 (negative cases), L264–L298 (positive case) |
| **RR3** Invented 0.15s audio/video duration tolerance | MAJOR | Removed the universal 0.15s delta entirely. Readiness now compares measured exported offsets/holds/drift against project-declared timing constraints (`timing_contract` sourced from brief/PRD); explicitly states unequal durations, holds, and offsets are valid when declared, and that matching durations do not prove sync. Manifest example demonstrates a declared 1.5s hold with unequal durations (7.95s audio vs 9.45s video). | L176–L180, L189/L205, L221, L228 |
| **RR4** Incomplete artifact-bound property evidence | MAJOR | §6.2 now requires artifact path+hash for every measurement, with per-property evidence: copy (artifact-bound OCR/text extraction + bounds inspection, content only); font family/weight (renderer-resolved font files, internal family/weight names, hashes, text-run mapping, plus reference glyph comparison) with explicit statement that OCR/bounding boxes/pixel sampling alone are NOT font proof; color/contrast (flat-region sampling with anti-aliasing/compression caveats, palette comparison, computed contrast ratio); timing (`ffprobe` durations/PTS/frame counts vs declared constraints); otherwise `unverified`/`unavailable`. | L321–L329 |
| **Observation** `proof_bindings` called an array | MINOR | Corrected to an object containing the `claim_refs`/`source_refs` arrays, matching the example at L68–L71 and existing vocabulary. | L35 |
| **Observation** `media_upload` read as unconditional ban | MINOR | Reworded: private assets MUST NOT be transmitted without matching verified consent/authority for that recipient and revision. | L101 |

Reconciliation of prior report claims:
- §3 item 3 / Scenario 2 "rejection of cross-scene asset reuse" is superseded: cross-scene **assignment** mismatch and unbound duplicate reuse are rejected; deliberate shared source media, including intentionally identical ranges, are allowed when explicitly bound and approved (L227, L264–L298).
- §7 R6 row "mandated measurable optical/ffprobe verification ... for exact text, font metrics, contrast, and timing" is now actually specified at L321–L329; the earlier wording overstated what the then-current text said.
- Unchanged and preserved: C1 direction/rights/proof mappings and consequential gaps (L25–L105); C2 revision-bound records, selective invalidation, exact prior-state preservation (L107–L164); C4 timeout rejoin and selective repair (L288–L304); C6 hostile-input, vendor-prediction, real-demo boundaries (L343–L357); closed storyboard schema untouched; capability-gap resolution and synthetic-vs-schema notices intact.

Checks performed (read-only, non-build): extracted and parsed all 5 fenced JSON examples in the contract with Node's `JSON.parse` → 5 blocks, 0 invalid. No behavioral/runtime verification claimed; examples remain synthetic guidance, not executed artifacts.

---

## 9. Third Scoped Correction (residual RR2 + example contradiction)

Scope unchanged: only the two owned files. Contract now 376 lines (was 357 at §8). No tests/build/lint/formatters, provider calls, installs, or delegation. Line numbers refer to the current contract.

| Item | Severity | Change | Evidence |
|---|---|---|---|
| **RR2 residual**: identical visual-range reuse still rejected | MAJOR | Invariant 3 retitled "Scene-Specific Assignment, Not File or Range Uniqueness". It now states that shared source files **and intentionally identical selected ranges** are not inherently invalid; any shared source needs an explicit per-scene binding (trim start/end, cue offset, hold, and role such as `recurring_background` or `music_bed`) reviewed against that scene's own narration, timing, pairing, and approval. Deliberate recurring visuals, shared audio/musical beds, and reused ranges PASS when bindings plus QA/approval establish intent. Rejection targets unbound references, cross-scene swaps, and mismatched assignments — not equality. No replacement constraint or threshold added. | L227 |
| **Positive example** only demonstrated distinct ranges | MAJOR (support) | §4.5 now shows two scenes deliberately reusing the **identical** `visual_range` `2.0–8.42` of one background clip with distinct audio ranges, per-scene timing declarations, roles, and approvals; gate evaluation states PASS for that equality and that equality alone is never a violation. | L264–L298 |
| **Negative example** wording implied equal references are the defect | MINOR | Reason reworded to `duplicate_unbound_assignment: audio/scene-02.wav referenced by two narrations with no per-scene binding`, with an explicit note that an intentional binding (§4.5) passes. | L258 |
| **Example contradiction**: scene-01 declared "no hold" but measured 0.08s hold | NONBLOCKING | Aligned synthetic measurement to the declaration: `measured_video_duration_seconds` 6.42 (was 6.50) and `measured_visual_hold_seconds` 0.0. No tolerance or rule inferred from the example; the general invariant at L228 is unchanged. | L178, L190–L193 |

Reconciliation: §8's RR2 row and its "identical ranges bound to different narrations ... rejected" wording are superseded by this section (report modified in place to point here). Everything else in §8 stands. The unequal-duration demonstration remains on `scene-02` (7.95s audio / 9.45s video with a declared 1.5s hold), so removing the scene-01 delta does not change the RR3 evidence.

Checks performed (read-only, non-build): re-extracted and parsed the 5 fenced JSON examples with Node's `JSON.parse` → 5 blocks, 0 invalid; grep confirmed no residual `0.08`, "identical ranges assigned", or "not overlap identically" text. Static guidance only; no runtime, packaging, or efficacy claim.

