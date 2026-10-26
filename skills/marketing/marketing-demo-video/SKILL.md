---
name: marketing-demo-video
description: 'Produces authentic, accessible product and terminal demo videos with zero mandatory provider fees, verified command execution, and open-source media recipes. Validates storyboard contracts against closed schemas, enforces synchronized WebVTT captions and transcripts, governs media rights assertions, and halts unapproved generative spending. Use when scripting, recording, editing, or captioning product walk-throughs, terminal demos, or campaign video assets. (triggers: `demo video`, `terminal demo recording`, `product demo video`, `captioned demo`, `ffmpeg demo video`)'
guardrail: true
metadata:
  triggers:
    files: []
    keywords:
      - 'demo video'
      - 'terminal demo recording'
      - 'product demo video'
      - 'captioned demo'
      - 'ffmpeg demo video'
      - 'demo storyboard'
---

# Demo Video Production Standard

## **Priority: P0 (CRITICAL)**

Standardize authentic, accessible product and terminal demo video production with zero mandatory media-provider fees, verified command execution, and open-source recipes. Enforce synchronized captions, transcripts, rights assertions, and strict spend governance.

## Core Rules

1. **Grounded Evidenced Behavior Only (AC-27)**:
   - Every terminal command and UI action must execute against verified repository code at the recorded commit revision.
   - Never fabricate terminal output, simulate unbuilt features, or insert mock screenshots. Actual campaign video export is delivered under campaign execution (T09); T06 provides resource readiness.
2. **Zero Mandatory Media-Provider Fees**:
   - Primary production path incurs zero third-party platform or generation fees using native screen capture, `ffmpeg`, and `ffprobe`. Developer hours and local compute are accounted separately.
3. **Paid Generative Media & Spend Governance (AC-15)**:
   - Commercial generative APIs require pre-quoted unit costs, an explicit spending cap, and a documented decision authorization reference assertion (`authorization: "DEC-xxx"`).
   - An authorization string or rights boolean is an input contract assertion, not authenticated human approval. If spend exceeds the cap or authorization is missing/null, hold or decline execution.
4. **Media Rights & Provenance Verification**:
   - Audio tracks, sound effects, and visuals must declare verified CC0-1.0, Apache-2.0, or licensed royalty-free provenance with attribution. Reject uncredited loops or third-party rips.
5. **Captions, Transcripts, & Accessibility (AC-27)**:
   - Every produced video must ship synchronized WebVTT (`.vtt`) or SubRip (`.srt`) captions and a complete Markdown transcript.
   - Caption `start_seconds`/`end_seconds` are **scene-local** offsets; the compiler resolves them onto the global timeline by accumulating preceding scene durations. Any narrated scene requires at least one caption; caption intervals must be ordered and non-overlapping within their scene.
   - Maintain $\ge 18\text{px}$ terminal font size, high contrast ($\ge 4.5:1$), and no compulsory unmuted autoplay.
6. **Storyboard Contract Preflight**:
   - Script scenes with closed-schema properties, action types, caption bounds, and `claim_ref` traceability bindings.
   - Actions asserting an executed step (`terminal_command`, `editor_action`, `ui_interaction`) must declare a non-empty `claim_ref`; narration may leave it `null`.
   - `claim_ref` format is validated only; it does not resolve external evidence. `synthetic: true` declares that no real evidence, recording, or product execution exists behind the declared references.

## CLI Preflight & Verification

Resolve `<marketing-demo-video-dir>` to the installed package directory that contains this `SKILL.md` — for a standard install `<agent-root>/marketing/marketing-demo-video`, or a flattened install `<agent-root>/marketing-marketing-demo-video`. The CLI locates its schema relative to `import.meta.url`, so a copied or flattened package works from any working directory:
```bash
node <marketing-demo-video-dir>/scripts/validate-demo-storyboard.mjs \
  <storyboard.json> \
  --check \
  --format json|vtt|transcript
```
*Note: Validates closed schema and contract assertions; does not verify external evidence or grant legal rights.*

### Input & Diagnostic Boundaries

- The CLI accepts exactly one regular file of at most 1 MiB. Symlinks, special files (directories, FIFOs, devices), oversized files, unreadable files, and files that change during the read are rejected before parsing.
- Failures print a fixed JSON code on stderr: `INPUT_TOO_LARGE`, `INPUT_NOT_REGULAR_FILE`, `INPUT_SYMLINK_REJECTED`, `INPUT_UNREADABLE`, `INPUT_CHANGED`, `INPUT_INVALID_JSON`, `SCHEMA_MISSING`, `SCHEMA_UNREADABLE`, `STORYBOARD_INVALID` (with validated issue list), `UNSAFE_VTT_PAYLOAD`, or `INTERNAL_ERROR`. Caller-supplied property names, values, filesystem paths, and parser exception text are never reflected; issue entries reference known field paths only.
- The JSON report's `summary` is a typed projection emitted only for an accepted storyboard; rejected input returns `"summary": null` so no caller-supplied identity or nested value is echoed back.
- Cue payloads may be multiline, but a blank line, the `-->` timing arrow, or a control character is rejected as `UNSAFE_VTT_PAYLOAD` so caption text cannot create extra WebVTT blocks. `<`, `>`, and `&` are escaped at serialization, preserving rendered text while neutralizing markup. Human-authored transcript content is not a diagnostic channel.

## Anti-Patterns

- **No Fabricated Output**: Never splice fake CLI output or nonexistent UI features into demo videos.
- **No Unapproved Spend**: Never charge generative video APIs without explicit budget caps and authorization.
- **No Missing Captions**: Never ship video walkthroughs without synchronized WebVTT subtitles and transcript.
- **No Unverified Audio**: Never use commercial music tracks or unverified media downloads.
- **No Compulsory Autoplay**: Never configure web video players to autoplay unmuted audio.

## References

- [Capture & Edit Recipe](references/capture-edit-recipe.md) — Step-by-step local capture, cropping, padding, and ffmpeg encoding commands.
- [Rights & Cost Checklist](references/rights-cost-checklist.md) — Provenance assertions, commercial API spend governance, and accessibility standards.
- [Storyboard Schema](assets/demo-storyboard.schema.json) — Closed JSON Schema for evidence-bound demo contracts.
