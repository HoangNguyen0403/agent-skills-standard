# Content Mapping Reference

## 1. Intent, Channel, and Action Triad (AC-21)

Every asset proposed in a marketing content strategy must satisfy the triad contract:

```json
{
  "asset_id": "guide-token-optimization",
  "context_revision": "ctx-rev-20261025-01",
  "intent": {
    "category": "procedural",
    "problem_statement": "Developers running agent pipelines face 429 quota exhaustion and high token expenditure on CLI command outputs.",
    "evidence_ref": "SRC-MKT-004"
  },
  "channel": {
    "path": "docs/guides/token-optimization.md",
    "format": "technical_guide",
    "target_segment": "agent_pipeline_maintainers"
  },
  "action": {
    "observable_target": "Install rtk proxy and execute benchmark command with token accounting enabled.",
    "verification": "rtk gain command output observed",
    "primary_cta": "Run rtk gain to inspect local token compression ratio"
  },
  "proof_bindings": {
    "claim_refs": ["CLM-004"],
    "source_refs": ["SRC-MKT-004"]
  },
  "state": "prepared"
}
```

## 2. Intent Categorization

1. **Informational Intent**:
   - Focus: Deep architectural understanding, protocol boundaries, trade-off comparisons.
   - Typical Channels: Repository Architecture documentation, technical blog whitepaper.
   - Intended Action: Read contract specifications, inspect architectural decision records.
2. **Procedural Intent**:
   - Focus: Exact commands, configuration snippets, reproduction steps, troubleshooting.
   - Typical Channels: Getting-started guides, setup tutorials, CLI manuals.
   - Intended Action: Clone repository, execute test suite, run local CLI filter.
3. **Evaluative Intent**:
   - Focus: Evidence-based benchmark results, offline scorecard verification, objective constraint analysis.
   - Typical Channels: Benchmark reports, comparative evaluation briefs.
   - Intended Action: Run offline evaluation script, review synthetic test fixtures.

## 3. Brand Action Boundaries: Apply, Extend, Create (AC-01)

Content strategy categorizes creative production actions into three strict boundaries:

1. **`apply` (Verbatim Application)**:
   - Use supplied approved brand assets (logo SVG, color palette hex codes, approved typography, exact approved copy) directly.
   - Proposing an unrequested redesign, alternate color scheme, or altered slogan when approved brand assets exist is strictly prohibited.
2. **`extend` (Format Adaptation)**:
   - Adapt approved brand assets to new deliverable formats or aspect ratios while strictly preserving foundation tokens and recording consumed revisions in dependency records.
3. **`create` (Commissioned Generation & Revisions)**:
   - Generate new brand identity assets or revise existing brand tokens only when explicitly commissioned and authorized in the brief.
   - Commissioned revisions create new proposed revisions (e.g., `v2.0` $\to$ `v2.1`), preserving prior approved revisions in the ledger. When authorized, new revisions update locked tokens and invalidate dependent outputs according to selective invalidation rules (AC-02).
   - Do not assume an unverified brand-design renderer or prompt-enhancement service exists in the local environment.
## 4. Format-over-Scene Deliverable Routing (AC-03)

When a creative request combines a deliverable format with descriptive scene cues, **output format takes absolute precedence over scene styling**:

1. **Format Governance**: The deliverable format (`channel.format`) dictates aspect ratio, pixel dimensions, layout hierarchy, and copy density.
2. **Scene Subordination**: Descriptive scene cues (e.g., "showing developer at desk", "kitchen counter recipe") provide subject matter within the format bounds; they NEVER alter the container dimensions or layout rules.

### Format vs Scene Scenario Table

| Requested Deliverable | Scene Description | Resolved Format (`channel.format`) | Resolved Geometry | Role of Scene Description |
|---|---|---|---|---|
| "Hero banner showing tool use in terminal" | Developer typing commands in modern dark-theme terminal | `hero_banner` | 1200x630 (1.91:1 landscape web header) | Provides background visual cue; layout maintains web headline and prominent CTA button. |
| "Pinterest graphic of kitchen recipe prep" | Close-up of cutting board on sunlit kitchen counter | `pinterest_graphic` | 1000x1500 (2:3 vertical pin) | Provides photographic subject; layout maintains vertical pin aspect ratio and save CTA. |
| "Terminal walkthrough demo" | Running CLI benchmark across 3 shell commands | `terminal_walkthrough` | 1920x1080 (16:9 video container) | Provides procedural CLI screencast; layout maintains full terminal pane and caption area. |

## 5. Creative Brief Intake & Re-Ask Minimization (AC-04)

When supplied a structured creative brief, the agent MUST reuse supplied parameters without re-confirming them:

```json
{
  "brief_id": "brief-hero-launch-01",
  "context_revision": "ctx-rev-20261026-01",
  "channel": {
    "format": "hero_banner",
    "dimensions": "1200x630"
  },
  "exact_copy": {
    "headline": "Token-Optimized Agent Workflows",
    "primary_cta": "Run rtk gain to inspect compression ratio"
  },
  "supplied_assets": [
    {"asset_id": "asset-logo-primary", "revision": "v1.2", "approval_ref": "APR-BRAND-01"},
    {"asset_id": "asset-palette-core", "revision": "v2.0", "approval_ref": "APR-BRAND-02"}
  ],
  "creative_direction": {
    "tone": "concise, technical",
    "visual_theme": "dark-mode terminal"
  },
  "rights_context": {
    "declared_license": "Apache-2.0"
  }
}
```

- **Re-Ask Rule**: If all required fields are present (audience, format, dimensions, copy, supplied assets, creative direction, rights context), proceed directly to planning. NEVER ask the user to re-confirm supplied constraints.
- **Consequential Gap Exception**: Ask follow-up questions ONLY if a critical parameter is missing (e.g. absent `rights_context` or missing `creative_direction`).

## 6. Rejection Rules

- Reject assets without `intent.evidence_ref` or verifiable user problem.
- Reject assets lacking a concrete `channel.path`.
- Reject assets where `action` is abstract ("engage with brand", "learn more") without an observable step.
- Reject assets without `context_revision` binding matching the campaign and proof ledger.
- Reject invented monthly search volume, keyword difficulty, or cost-per-click metrics without primary verified data.
- Reject programmatic bulk generation of repetitive, thin SEO content.
- Reject unrequested brand redesign proposals or unprompted copy modifications when approved brand assets are supplied (AC-01); explicitly commissioned revisions follow the `create`/`extend` lifecycle.
- Reject subordinating deliverable format or dimensions to scene descriptions (AC-03).
- Reject re-asking users for parameters already specified in a complete brief (AC-04).
