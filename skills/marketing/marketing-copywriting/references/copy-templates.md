# Copy Templates Reference

> **Illustrative Synthetic Guidance Only — Not Observed Evidence**: The templates, metadata records, claim IDs (e.g., `CLM-001`, `CLM-004`), production outputs, and inspection fields in this document are structural templates and synthetic guidance examples. They are NOT observed rendering evidence, verified OCR transcripts, or real campaign proof. Consumers MUST replace all placeholder fields with actual proof register claims, delivered artifact paths/hashes, and honest observed measurements. Pre-populating unmeasured check success in production or deliverable templates is strictly prohibited.
## 1. Technical Release Announcement Template

```markdown
---
asset_id: announcement-v1-2
context_revision: ctx-rev-20261025-01
state: prepared
claim_refs: ["CLM-001", "CLM-004"]
---

### Announcement: Developer Tool v1.2

Today we are releasing Developer Tool v1.2, introducing deterministic offline marketing measurement and token-optimized CLI tooling.

**Key Technical Capabilities:**
- **Deterministic Measurement**: Run offline cohort analysis and 14-day repeat rate scorecards against local test fixtures.
  *Scope & Qualifications: Tested on offline synthetic fixtures (Node >=20); real provider telemetry and public domain reporting require separate review.*
- **Shell Output Optimization**: Filter redundant terminal output before feeding context to AI models.
  *Scope & Qualifications: Measured 60–90% token reduction across git, cargo, and docker CLI streams on macOS arm64; Windows cmd.exe untested.*

**Verification Command:**
```bash
rtk gain --history
```
```

## 2. Feature Spotlight Template (Prepared State)

```markdown
---
asset_id: spotlight-offline-measurement
context_revision: ctx-rev-20261025-01
state: prepared
claim_refs: ["CLM-003"]
---

### Feature Spotlight: Offline Marketing Measurement Standard

Measure developer tool adoption without relying on unverified third-party analytics or fabricated ROI claims.

**How it works:**
1. Ingest immutable JSON cohort fixtures containing external starter and activation events.
2. Partition mature activations (a + 14 days) into confirmed returns and explicit no-returns.
3. Compute exact BigInt rational ratios with zero-denominator safety.

*Notice: This capability evaluates local synthetic fixtures. It does not connect to live ad networks or convert labor capacity into cash margins.*
```

## 3. Hero Banner Copy Template (AC-01, AC-03, AC-04)

```markdown
---
asset_id: hero-banner-launch
context_revision: ctx-rev-20261026-01
state: prepared
channel:
  format: hero_banner
  dimensions: 1200x630
claim_refs: ["CLM-004"]
dependency_asset_ids: ["asset-logo-primary", "asset-palette-core"]
consumed_revisions:
  asset-logo-primary: "v1.2"
  asset-palette-core: "v2.0"
---

### Deliverable: Hero Banner (Web Header 1200x630)

**Approved Headline (Verbatim AC-01):**
Token-Optimized Agent Workflows

**Subhead (Proof-Qualified AC-22):**
Compress shell tool command outputs by 60–90% on macOS arm64 (Node 20+).
*Tested on git, cargo, and docker CLI logs; Windows and non-UTF8 streams untested.*

**Primary Call-to-Action (Verbatim AC-01):**
Run rtk gain to inspect compression ratio

**Rendered Artifact Status & Inspection Template (AC-10, AC-11):**
*(To be filled at delivery time from actual observed output; do NOT pre-fill check success)*
- `produced_artifact`: `"[PATH_TO_DELIVERED_FILE]"` (SHA-256: `"[ACTUAL_SHA256_HASH]"` or `"pending_delivery"`)
- `exact_copy_check`: `"pending_ocr_inspection"` — Execute artifact-bound OCR or text extraction; compare verbatim against approved copy; inspect visible bounds for overflow.
- `font_status`: `"pending_font_resolution_check"` — Inspect resolved renderer font logs and glyphs. If custom font is unavailable, record limitation: `custom_font_missing; unverified_typography` (fallback preview does NOT equal approved brand typography).
- `format_limitation`: `"[disclose_if_native_editable_format_unavailable]"` — e.g. "Flattened raster PNG; native Figma/vector source unavailable."
```

## 4. Pinterest Pin Visual Copy Template (AC-03)

```markdown
---
asset_id: pin-kitchen-recipe-prep
context_revision: ctx-rev-20261026-01
state: prepared
channel:
  format: pinterest_graphic
  dimensions: 1000x1500
scene_cue: "Close-up countertop recipe preparation in bright kitchen"
claim_refs: ["CLM-MKT-SAMPLE-01"]
dependency_asset_ids: ["asset-logo-primary"]
---

### Deliverable: Pinterest Graphic (2:3 Vertical Pin 1000x1500)

*(Note: Format governance enforces 2:3 vertical pin dimensions and pin layout; scene description provides the kitchen visual subject matter within that container. Illustrative copy structure below; replace with verified register claim.)*

**Overlay Headline:**
Fast Weeknight Recipe Prep

**Secondary Text (Proof-Qualified Sample):**
Structured mise-en-place workflow.
*Tested on synthetic pilot kitchen workflows; real cooking times vary.*

**Pin Action / CTA:**
Save to Weeknight Dinners

**Rendered Artifact Status & Inspection Template (AC-10, AC-11):**
*(Fill from observed artifact inspection only; do not assert unverified rendering)*
- `produced_artifact`: `"[PATH_TO_DELIVERED_PIN_IMAGE]"` (SHA-256: `"[ACTUAL_SHA256_HASH]"`)
- `exact_copy_check`: `"pending_ocr_inspection"`
- `format_limitation`: `"flattened_raster_png; layered_vector_unavailable"`
```

## 5. Exact-Copy Correction & Selective Repair Record (AC-09) *(Illustrative Synthetic Record)*

```json
{
  "campaign_id": "standards-launch-01",
  "context_revision": "ctx-rev-20261026-01",
  "cross_asset_qa_event": "Defect detected in hero banner subhead; body copy and announcement passed QA.",
  "remediation_scope": {
    "target_asset_id": "hero-banner-launch",
    "action": "selective_repair",
    "defect_repaired": "Corrected omitted Node 20+ platform qualification in banner subhead.",
    "new_state": "prepared"
  },
  "unaffected_assets": [
    {
      "asset_id": "announcement-v1-2",
      "prior_state": "authorized",
      "new_state": "authorized",
      "status": "preserved_unchanged"
    },
    {
      "asset_id": "spotlight-offline-measurement",
      "prior_state": "prepared",
      "new_state": "prepared",
      "status": "preserved_unchanged"
    }
  ]
}
```

## 6. Stale Dependency Invalidation Record (AC-02) *(Illustrative Synthetic Record)*

```json
{
  "event": "palette_foundation_update",
  "changed_asset_id": "asset-palette-core",
  "new_revision": "v2.1",
  "invalidated_outputs": [
    {
      "output_id": "hero-banner-launch",
      "declared_dependencies": ["asset-logo-primary", "asset-palette-core"],
      "prior_state": "authorized",
      "new_state": "stale",
      "reason": "Declared dependency asset-palette-core updated to v2.1"
    }
  ],
  "unaffected_outputs_preserved": [
    {
      "output_id": "pin-kitchen-recipe-prep",
      "declared_dependencies": ["asset-logo-primary"],
      "prior_state": "authorized",
      "new_state": "authorized",
      "reason": "Does not consume asset-palette-core; exact prior state preserved"
    },
    {
      "output_id": "announcement-v1-2",
      "declared_dependencies": ["asset-logo-primary"],
      "prior_state": "prepared",
      "new_state": "prepared",
      "reason": "Non-dependent proposal retains prepared; NOT promoted"
    }
  ]
}
```

## 7. Deliverable Limitation Disclosure Record (AC-11) *(Illustrative Synthetic Record)*

```json
{
  "asset_id": "hero-banner-launch",
  "requested_format": "layered_vector_figma",
  "requested_font": "BrandSans-Bold",
  "delivered_format": "flattened_raster_png",
  "delivered_font": "Inter-SemiBold",
  "limitations": [
    {
      "type": "format_unsupported",
      "disclosure": "Native layered Figma source format unavailable; delivered flattened 1200x630 PNG preview only. Flattened raster is NOT an editable source."
    },
    {
      "type": "font_missing",
      "disclosure": "Custom font BrandSans-Bold unavailable in host environment; substituted Inter-SemiBold. Rendered typography is unverified against primary brand specimen."
    }
  ]
}
```
