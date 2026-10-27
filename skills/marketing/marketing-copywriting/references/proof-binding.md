# Proof Binding & Qualification Preservation Reference (AC-22)

## 1. Overview of AC-22 Contract

When drafting marketing copy from proof register claims, the copywriter must preserve all qualifications, testing boundaries, and caveats in the output asset.

> **Illustrative only — not proof.** The `CLM-004` claim, percentages, command lists, and platform/version bounds shown in this reference are fictional examples that demonstrate the preservation mechanics. They are not a source of proof and must never be copied into an asset as evidence. Generated copy MUST bind to the actual claim text in the proof register; optional details such as `Node.js >=20` apply only when the bound claim itself states them.

```
+-------------------------------------------------------------------+
| FICTIONAL PROOF REGISTER EXAMPLE (illustrative, not real proof)   |
| Claim: CLM-004 (illustrative)                                     |
| Statement: "Reduces CLI output tokens by 60-90%."                 |
| Qualifications:                                                   |
|  - Tested exclusively on shell tool outputs (git, cargo, docker)   |
|  - Measured on macOS arm64 under Node.js >=20                     |
|  - Untested on Windows command prompts and non-UTF8 logs          |
+-------------------------------------------------------------------+
                                  |
                                  | AC-22: Qualification Preserved
                                  v
| GENERATED COPY (Prepared State)                                   |
| "Compress shell tool outputs by 60–90% on macOS arm64 (Node 20+). |
| *Tested on standard git, cargo, and docker CLI logs; Windows and  |
| non-UTF8 command streams currently untested.*"                    |
+-------------------------------------------------------------------+
```

## 2. Copy Asset Metadata Contract

Every copy artifact must include metadata anchoring it to the proof register. The values below are the same fictional illustration, not real register records:

```json
{
  "copy_id": "hero-cli-token-optimization",
  "context_revision": "ctx-rev-20261025-01",
  "state": "prepared",
  "claim_refs": ["CLM-004"],
  "source_refs": ["SRC-MKT-004"],
  "qualifications_preserved": [
    "Applies strictly to shell tool outputs (git, cargo, docker)",
    "Measured on macOS arm64 under Node.js >=20",
    "Windows and non-UTF8 environments untested"
  ],
  "not_ready_limitations": []
}
```

## 3. Transformation & Preservation Rules

| Input Proof Claim / Asset State | Permitted Copy Expression | Prohibited / Rejected Copy Expression |
|---|---|---|
| Approved Brand Headline (AC-01) | Exact approved copy preserved verbatim in `apply` operations (e.g., "Token-Optimized Agent Workflows"); commissioned revisions produce new revision-bound proposals | Unrequested rewriting or unprompted paraphrasing of approved slogan (e.g., "AI Token Cutter") |
| Narrow benchmark (git, cargo, docker; 60–90% savings) | "Measured 60–90% token reduction across git, cargo, and docker commands." | "Reduces AI agent costs by 90% across your entire software stack." |
| Offline synthetic measurement (T02) | "Deterministic offline cohort measurement tested against synthetic pilot fixtures." | "Proven to double real customer retention and enterprise campaign ROI." |
| Experimental / NOT READY feature | "Experimental alpha capability; developer preview for evaluation only." | "Battle-tested, enterprise-ready, production-grade release." |
| Labor hours capacity metric | "Reduces maintainer review workload by up to 10 hours per release." | "Saves your team $1,500 per sprint in labor costs." |
| Predictive attention score (AC-13) | "Synthetic attention score 84/100 (heuristic visual salience prediction; not observed conversion)." | "Guaranteed 84% click-through rate and 3x conversion lift." |

## 4. Rendered Evidence vs Source Diffs (AC-10)

Source-level markdown diffs prove only document-level text changes. They **NEVER prove rendered copy fidelity, font weight, or visual alignment on delivered graphical or video artifacts**:

1. **Render Failure Modes**: Graphics rendering engines can silently drop glyphs, substitute fallback typefaces, truncate headlines due to narrow container bounds, or alter font weight.
2. **Measurable Proof Standards**:
   - **Exact Copy Fidelity**: Requires artifact-bound text extraction or OCR performed on the delivered raster image or video frames, compared directly with the brief's verbatim copy, plus visible bounding box verification to confirm zero text clipping.
   - **Font Family and Weight**: Requires renderer-side logs identifying the resolved font file and hash, plus rendered glyph inspection against reference renders. OCR or pixel sampling alone does NOT prove font family or weight.
   - **Color and Contrast**: Requires flat-region pixel sampling on the delivered artifact (stating compression and anti-aliasing caveats) and computed contrast ratios against declared palette tokens.
   - **Truthful Status**: Any property not deterministically verified on the delivered artifact must be labeled `unverified` or `unavailable`. Overclaiming source diffs as rendered proof is strictly prohibited.

## 5. Truthful Fact Classification Ledger (AC-10)

Every copy and visual deliverable review record must classify claims into strict evidential categories:

| Fact Category | Evidential Meaning | Required Evidence |
|---|---|---|
| `requested` | Specification stated in creative brief or PRD. | Verbatim excerpt from approved creative brief. |
| `produced` | Raw artifact generated by renderer or pipeline. | Delivered file path and SHA-256 hash. |
| `measured` | Deterministically verified property on output. | OCR text extraction, resolved font log, `ffprobe` stream PTS. |
| `visually_reviewed` | Qualitative inspection by human reviewer. | Reviewer log; visual plausibility does not equal measured proof. |
| `approved` | Formal campaign owner sign-off. | Explicit human sign-off reference scoped to specific revision. |
| `stale` | Asset whose declared dependencies changed. | Dependency invalidation record linking to changed token. |
| `unavailable` | Requested feature, format, or font cannot be delivered. | Capability gap disclosure. |

## 6. Editable vs Flattened Asset Disclosures (AC-11)

1. **Format Honest Disclosure**: A flattened raster image (`.png`, `.jpg`) or flattened video (`.mp4`) is NOT an editable source file.
2. **Native Tooling Limitations**: If the brief requests native editable formats (`.psd`, `.ai`, Figma components) but the environment can only emit flattened renders, the agent MUST explicitly disclose this limitation (`limitation: "flattened_preview_only; native_editable_source_unavailable"`). Substituting a flattened preview as "editable" is prohibited.
3. **Missing Font Disclosures**: If a requested custom brand font is absent from the rendering environment, report the missing font as a capability gap rather than silently substituting system fonts.
