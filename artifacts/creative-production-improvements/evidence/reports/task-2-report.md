# Task 2 Report: Marketing Guidance Implementation

## 1. Summary & Changed Paths

Task 2 has implemented marketing guidance improvements across `marketing-content-strategy` and `marketing-copywriting` packages without introducing new schemas, runtime engines, unapproved dependencies, or violating the 100-line core skill constraint.

### Changed Files (Strictly Owned by Task 2)
1. `skills/marketing/marketing-content-strategy/SKILL.md` (73 lines, within 100-line limit)
2. `skills/marketing/marketing-content-strategy/references/content-mapping.md`
3. `skills/marketing/marketing-content-strategy/references/editorial-governance.md`
4. `skills/marketing/marketing-copywriting/SKILL.md` (69 lines, within 100-line limit)
5. `skills/marketing/marketing-copywriting/references/proof-binding.md`
6. `skills/marketing/marketing-copywriting/references/copy-templates.md`

---

## 2. Acceptance Criteria (AC) Coverage

| Acceptance Criteria | Implemented File(s) & Section(s) | Evidential Mechanism & Contract Rule |
|---|---|---|
| **AC-01** (Brand preservation over redesign) | `marketing-content-strategy/SKILL.md` §3.1<br>`content-mapping.md` §3<br>`marketing-copywriting/SKILL.md` §3.1<br>`proof-binding.md` §3 | Strict `apply` boundary: supplied approved brand assets (logo, palette, typography) and exact copy must be preserved verbatim. Proposing unrequested redesigns, palette modifications, or copy alterations is explicitly prohibited. |
| **AC-02** (Selective dependency invalidation & exact prior state) | `marketing-content-strategy/SKILL.md` §4.1<br>`editorial-governance.md` §4<br>`marketing-copywriting/SKILL.md` §4.1<br>`copy-templates.md` §6 | Invalidate (`state: "stale"`) ONLY assets whose `dependency_asset_ids` include the revised token. Unaffected assets strictly preserve their exact prior state (`prepared`, `authorized`, `rejected`, or `stale`). An unrelated foundation change NEVER promotes an unapproved or rejected asset to accepted/authorized. |
| **AC-03** (Format-over-scene precedence) | `marketing-content-strategy/SKILL.md` §3.2<br>`content-mapping.md` §4<br>`copy-templates.md` §3, §4 | Output deliverable format (`channel.format`, e.g., `hero_banner`, `pinterest_graphic`) governs dimensions, aspect ratio, layout hierarchy, and copy density. Descriptive scene cues (e.g., "showing product in use", "kitchen counter") inform visual subject matter within that format; they NEVER alter deliverable geometry. |
| **AC-04** (Brief re-ask minimization) | `marketing-content-strategy/SKILL.md` §3.3<br>`content-mapping.md` §5 | When a creative brief supplies complete required constraints (audience, format, dimensions, copy, assets, direction, rights), reuse them directly. Do not prompt users to re-confirm supplied constraints. Clarifications are permitted only when a consequential constraint is missing. |
| **AC-09** (Cross-asset QA & selective repair) | `marketing-content-strategy/SKILL.md` §4.2<br>`editorial-governance.md` §5<br>`marketing-copywriting/SKILL.md` §4.2<br>`copy-templates.md` §5 | In multi-asset sets, isolate and repair only the failing deliverable or copy line. Retain all passing and approved sister assets in their exact prior state without broad regeneration. |
| **AC-10** (Exact vs visual rendered evidence) | `marketing-copywriting/SKILL.md` §3.2<br>`proof-binding.md` §4, §5 | Source markdown diffs prove only document-level text alignment; they do NOT prove rendered copy fidelity, font weight, or visual alignment on delivered graphic/video artifacts. Proof requires artifact-bound OCR/text extraction + visible bounds, renderer-side font logs + glyph inspection, and flat-region pixel sampling for color/contrast. Unverified properties must be labeled `unverified`. |
| **AC-11** (Editable format & font limitation disclosures) | `marketing-copywriting/SKILL.md` §3.3<br>`proof-binding.md` §6<br>`copy-templates.md` §7 | If native editable formats (`.psd`, `.ai`, Figma) are requested but only flattened renders (`.png`, `.jpg`) can be produced, disclose this limitation honestly (`flattened_preview_only`). Report missing custom brand fonts as a capability gap rather than silently substituting system fonts. |
| **AC-12** (Input contract assertions vs runtime authority) | `marketing-content-strategy/SKILL.md` §4.3<br>`editorial-governance.md` §6.1<br>`marketing-copywriting/SKILL.md` §4.3 | Text strings (`authorization: "DEC-xxx"`, `permitted_operations`, `assets_cleared: true`) are untrusted input assertions, NOT runtime execution authority. Gating is enforced on `tool_install`, `media_upload`, `spend_budget`, and `publish_public`. |
| **AC-13** (Predictive vendor metric labeling) | `marketing-content-strategy/SKILL.md` §4.3<br>`editorial-governance.md` §6.2<br>`marketing-copywriting/SKILL.md` §4.3<br>`proof-binding.md` §3 | Third-party predictive metrics (attention heatmaps, engagement predictions) must be labeled as synthetic heuristic predictions/proxies, NEVER represented as measured conversion or causal financial ROI. |
| **AC-15** (100-line core limit & metadata validation) | `marketing-content-strategy/SKILL.md`<br>`marketing-copywriting/SKILL.md` | Core `SKILL.md` files are strictly constrained: `marketing-content-strategy` is 73 lines; `marketing-copywriting` is 69 lines. Detailed schemas, tables, and scenario walkthroughs are extracted to `references/`. |

---

## 3. Scenario Reasoning Walkthroughs

### Scenario 1: Hero Banner Showing Product in Use (AC-01, AC-03, AC-04)
- **Brief Request**: "Create a hero banner showing customer using product in modern office, with headline 'Token-Optimized Agent Workflows' and primary CTA 'Run rtk gain to inspect compression ratio'."
- **Reasoning**:
  1. *Format-over-scene routing (AC-03)*: Deliverable format `hero_banner` governs geometry $\to$ 1200x630 landscape container, high-contrast headline, and primary CTA button. The scene description ("customer using product in modern office") provides the background compositional theme; it does not turn the deliverable into an unformatted illustration or video.
  2. *Approved copy fidelity (AC-01)*: The approved headline and CTA are applied verbatim without unauthorized paraphrasing or redesign.
  3. *Re-ask minimization (AC-04)*: All deliverable parameters, copy, and dimensions are provided; the agent proceeds without re-prompting the user.

### Scenario 2: Pinterest Graphic in Kitchen Setting (AC-03)
- **Brief Request**: "Create a Pinterest pin of countertop recipe preparation in bright kitchen."
- **Reasoning**:
  1. *Format-over-scene routing (AC-03)*: Format `pinterest_graphic` dictates 1000x1500 (2:3 vertical pin aspect ratio) and save CTA overlay.
  2. *Scene subordination*: The kitchen preparation scene is rendered within the vertical pin container; it never alters the container into a horizontal banner or loose photos.

### Scenario 3: Exact-Copy Correction in Multi-Asset Campaign (AC-09)
- **Brief Request**: Review of a 3-deliverable campaign (hero banner, technical announcement, offline measurement spotlight). Cross-asset QA identifies that the hero banner subhead omitted the platform qualification ("macOS arm64, Node 20+"), while announcement and spotlight passed review.
- **Reasoning**:
  1. *Selective repair*: Isolate defect to `hero-banner-launch` subhead and correct the omitted platform qualification.
  2. *Preservation of passing assets*: `announcement-v1-2` (prior state `authorized`) and `spotlight-offline-measurement` (prior state `prepared`) strictly retain their exact prior states. No broad re-generation of valid assets occurs.

### Scenario 4: Revision-Bound Stale Dependency Invalidation (AC-02)
- **Brief Request**: Brand foundation token `asset-palette-core` is updated from `v2.0` to `v2.1`.
- **Reasoning**:
  1. *Declared dependency check*: `hero-banner-launch` declares `["asset-logo-primary", "asset-palette-core"]` $\to$ transitioned from `authorized` to `stale`.
  2. *Exact prior state retention*:
     - `pin-kitchen-recipe-prep` declares `["asset-logo-primary"]` (non-dependent, prior state `authorized`) $\to$ retains `authorized`.
     - `announcement-v1-2` declares `["asset-logo-primary"]` (non-dependent proposal, prior state `prepared`) $\to$ retains `prepared`; **NOT promoted** to `authorized`.
     - `failed-render-01` (prior state `rejected`) $\to$ retains `rejected`; **NOT promoted**.

### Scenario 5: Missing Custom Font & Native Layered Editor Limitations (AC-10, AC-11)
- **Brief Request**: Request specifies deliverable in layered `.ai` format using custom typeface `BrandSans-Bold`.
- **Reasoning**:
  1. *Format limitation disclosure (AC-11)*: Host environment can only emit flattened raster PNG previews; delivery explicitly discloses `limitation: "flattened_preview_only; native_editable_source_unavailable"`. Flattened raster is never claimed to be editable.
  2. *Font limitation disclosure (AC-11)*: `BrandSans-Bold` is unavailable in the environment; `Inter-SemiBold` is used as a fallback. The limitation is explicitly declared, and rendered typography is marked `unverified`.
  3. *Rendered evidence boundaries (AC-10)*: Markdown source text matching does NOT prove rendered font fidelity or visible layout bounds on the raster graphic.

---

## 4. Shared Contract Resolution & Independence

- **Content-Strategy**: Directly resolves package-local reference `references/creative-production-contract.md`.
- **Copywriting**: Resolves installed standard path `<agent-root>/marketing/marketing-content-strategy/references/creative-production-contract.md` or flattened `<agent-root>/marketing-marketing-content-strategy/references/creative-production-contract.md`. If missing, reports explicit `capability_gap: "missing_creative_production_contract"`.
- **Preserved Standalone Capabilities**: Standalone content planning, copywriting proof binding (AC-22), and capacity pacing remain fully operational even in the absence of the creative production contract.

---

## 5. Preserved Behaviors

- **Intent, Channel, and Action Triad (AC-21)**: Preserved verbatim in `content-mapping.md` and `marketing-content-strategy/SKILL.md`.
- **Proof Register Binding & Qualification Preservation (AC-22)**: Preserved verbatim in `proof-binding.md` and `marketing-copywriting/SKILL.md`.
- **Capacity Pacing & Governance**: Maintainer review hours (`capacity_hours`) and proposal-only lifecycle (`prepared` $\to$ `authorized` $\to$ `published`) remain strictly preserved.
- **Token Economy**: Both core skills are compact (73 and 69 lines), strictly below the 100-line limit.

---

## 6. Commands Actually Run

Per the dispatch contract, no test suites, linters, formatters, or build runners were executed during parallel writing:
- `rtk git status --short`: Executed to inspect modified file boundaries and verify zero out-of-scope edits.

---

## 7. Limitations & Known Gaps

- Source instructions define procedural constraints for agents; they do not constitute deterministic runtime host enforcement.
- Rendered OCR and pixel-level measurement checks require host tools (e.g., Tesseract OCR, ImageMagick, `ffprobe`) which must be present in the execution environment to produce `measured` fact status; without them, properties remain `unverified`.

---

## 8. Corrective Follow-Up Evidence (Resolution of R1, R2, R3)

Following independent review (`task-2-review.md`), three Major findings were addressed across the six owned files:

### 8.1 Finding R1: Restored Standalone Content Safety Rules
- **Defect**: Baseline anti-patterns prohibiting invented search volume, keyword difficulty, CPC metrics, and programmatic thin bulk publishing were inadvertently omitted from core anti-patterns.
- **Remediation**:
  - `marketing-content-strategy/SKILL.md` §5: Restored `- **No Keyword-Volume Fabrication**` and `- **No Bulk Publishing**` rules verbatim.
  - `content-mapping.md` §6: Explicitly added rejection rules for invented search volume/difficulty/CPC metrics and repetitive thin SEO content.
  - `marketing-content-strategy/SKILL.md` §1: Restored requirement that `context_revision` tokens must match the campaign and proof ledger.

### 8.2 Finding R2: Synthetic Boundary Notice & Unfilled Inspection Templates
- **Defect**: Copy templates previously contained pre-filled successful OCR matching, verified bounds, and resolved font assertions without a synthetic non-evidence boundary.
- **Remediation**:
  - `copy-templates.md` (top): Added a prominent notice establishing that all templates, claim IDs (`CLM-001`, `CLM-004`, `CLM-MKT-SAMPLE-01`), production outputs, and inspection fields are illustrative synthetic guidance, not observed evidence.
  - `copy-templates.md` §3 (Hero Banner): Replaced pre-filled OCR/font assertions with an honest unfilled template: `"[PATH_TO_DELIVERED_FILE]"`, `"pending_ocr_inspection"`, `"pending_font_resolution_check"`, and explicit note that fallback previews do NOT equal approved brand typography.
  - `copy-templates.md` §4 (Pinterest Pin): Replaced unevidenced claim pairing with labeled sample claim `CLM-MKT-SAMPLE-01`, synthetic workflow disclaimer, and unfilled inspection template.
  - `copy-templates.md` §5, §6, §7: Stamped all illustrative JSON review records with explicit `(Illustrative Synthetic Record)` markers.

### 8.3 Finding R3: Commissioned Revisions vs Unsolicited Redesign
- **Defect**: Blanket anti-patterns ("Reject requests to replace supplied approved brand assets or copy" / "Never alter supplied approved copy") conflicted with commissioned creation and revision workflows.
- **Remediation**:
  - Scoped prohibitions strictly to unprompted or unsolicited changes in `apply` operations.
  - `marketing-content-strategy/SKILL.md` §3.1 & `content-mapping.md` §3: Explicitly authorized commissioned revisions (`create` / `extend`), defining that owner-commissioned changes create new proposed revisions, update locked tokens, and selectively invalidate dependent outputs under AC-02.
  - `marketing-copywriting/SKILL.md` §3.1 & §5: Clarified that approved copy must be preserved verbatim in `apply` operations, while explicitly commissioned revisions follow the revision-bound lifecycle.
  - `proof-binding.md` §3: Updated transformation table to reflect that commissioned revisions produce new revision-bound proposals.

### 8.4 Verification of Constraints After Correction
- `marketing-content-strategy/SKILL.md`: 76 lines (<= 100-line budget).
- `marketing-copywriting/SKILL.md`: 70 lines (<= 100-line budget).
- Editorial cleanup: Removed duplicate heading in `editorial-governance.md` lines 26–27.
- Scope check: Strictly six Task 2-owned files touched; zero eval, script, schema, or shared contract changes.
