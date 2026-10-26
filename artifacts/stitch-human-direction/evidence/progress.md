# Human-directed Stitch Refinement (Integration Progress)

- **Status**: Candidate Integration Complete
- **Date**: 2026-10-25
- **Approval & Scope**: User approved direction and Subagent-Driven execution. Repository candidate only (common 2.9.2 / workflows 1.1.8); no live Stitch pilot, store release, or unpromoted runtime claim authorized.

## Workstream Summary

1. **Shared Guidance (Canonical UI Design)**:
   - Added canonical protocol reference: `skills/common/common-ui-design/references/human-direction.md`.
   - Core human-direction refinement loop: `Observation -> Impact -> Smallest Change -> Preserve Constraint`.
   - Tiers defined: Polish (default, layout/behavior preserved), Restyle (visual update, structure preserved), Rethink (explicit human request only).
   - Removed blanket anti-system-font and forced aesthetic-novelty rules in `common-ui-design/SKILL.md` and `references/tones.md`. Platform typography (`system-ui`, SF Pro, Roboto, Segoe UI, Inter) and untextured neutrals fully permitted when task-grounded.
   - Updated behavioral eval cases in `skills/common/common-ui-design/evals/evals.json`.

2. **Stitch Integration (Canonical Stitch Design & Workflows)**:
   - Aligned `skills/common/common-stitch-design/SKILL.md` and `references/prompting.md` with human direction refinement modes (`polish`, `restyle`, `rethink`, `tablet`, `justified no-change`), explicit `keep / change / avoid` prompt blocks, avoidance of geometry locks, and branching to justified no-change before writes.
   - Updated canonical workflows `.agents/workflows/create-stitch-design.md` and `.agents/workflows/review-stitch-design.md` with human-directed brief inputs, observed proof vs preference evaluation, justified no-change gate branching before asset generation, defect/context/taste findings taxonomy, portable relative references, and preservation checks against baseline regressions.

3. **Reviews & Corrections**:
   - Independent initial review: findings delivered in `source-review.json` (usage-limit on review worker noted; not marked clean pass).
   - Corrective reviews: six-axis scoring, screenshot citations, mode-sensitive preservation checks, and unresolved-blocker ready-handoff gates restored in `review-stitch-design.md`.
   - Parent final corrective contract review: documented in `final-contract-review.json`.

4. **Behavioral Evaluation Limits**:
   - Node completeness smoke verified: all 6 baseline and 6 candidate scenarios parsed and compared (`baseline.json`, `candidate.json`).
   - Criteria assessment: 18/18 both arms, no discriminating case (`assessment.json`).
   - Honest comparison limits: supporting-context mismatch noted in `comparison-limits.json` -> no causal uplift or visual-quality claim.

5. **Metadata, Changelog & Integration**:
   - Bumped `categories.common.version` to `2.9.2` and updated date to `2026-10-25` in `skills/metadata.json`.
   - Bumped `releases.workflows.version` to `1.1.8` in `skills/metadata.json`.
   - Recalculated token metrics via `scripts/calculate-tokens.ts` (common: 39,492 tokens across 44 skills, avg 898 tokens/skill).
   - Documented all changes under `## [Unreleased]` in `CHANGELOG.md`.

6. **Isolated Staging, Generator Parity & Validation Quality Gates**:
   - Staging generation ran in isolated disposable tree (`mktemp -d`) with read-only symlinked dependencies from primary checkout (`/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard`).
   - Excluded `.agent` from staging; all 26 SDD working files preserved with identical sha256 hashes (`pre-generate-hashes.txt`).
   - Parity verified across all 4 configured agent hosts (`.agents`, `.claude`, `.codex`, `.github`) for the 5 changed export files plus `_INDEX.md` (24/24 checks passed byte-for-byte).
   - Clarified export resource boundaries: `scripts/generate-indices.ts:44` excludes `evals/` from export collection (authoring/eval-only artifact).
   - Clarified workflow wrapper boundaries: `create-stitch-design` and `review-stitch-design` are unselected optional workflows in `.skillsrc.workflows` (33 standard SDLC workflows selected), hence preserved canonically in `.agents/workflows/` with no downstream command/prompt wrappers generated.
   - Validation gates executed and passed: `audit:sdlc` (PASS), `audit:skills` (PASS), `check-alignment` (PASS), `audit:injection` (PASS), `freshness:audit` (PASS).

## Evidence & Receipts
- Working evidence: `.agent/sdd/stitch-human-direction/`
- Immutable tracked archive: `artifacts/stitch-human-direction/evidence/`
- Manifest: `artifacts/stitch-human-direction/evidence/MANIFEST.json`
- Integration receipt: `artifacts/stitch-human-direction/evidence/integration-receipt.json`
