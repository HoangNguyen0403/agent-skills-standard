# Artifacts: Evidence-Led Marketing Initiative

## Overview

This directory preserves durable public evidence and evaluation archives for the `evidence-led-marketing` initiative in `agent-skills-standard`.

Because active development evidence under `.agent/sdd/` is git-ignored, and incomplete benchmark evaluation directories under `benchmarks/evals/runs/` fail CI `evals:verify --all` (which requires completed `results.json` and `inputs.json`), durable review evidence is tracked here in version control.

## Contents

1. **`evidence/`**:
   - Curated, reviewable final reports and acceptance receipts preserved from `.agent/sdd/prd-plan-evidence-led-marketing/`.
   - Verified with cryptographic SHA-256 digests in `evidence/MANIFEST.json`.
   - Includes T09 media acceptance, T10 landing/accessibility surface acceptance, T10 report with parent-corrected AC labels, T12 security slice review, consumer integration record (sanitized projection), evaluation stop decision, evaluation current state, covering checkpoint, and cost audit.
2. **`stopped-evaluation/`**:
   - Byte-for-byte archive of the fresh evaluation run (`marketing-v2.6.6-2026-10-25T08-37-41-103Z-7c90e94d`) outside the benchmark runner tree.
   - Contains run manifest, 171 prompt specifications across all 12 marketing skills, and the two bundled answers/audits (baseline vs with-skill for `marketing-audience-research/eval-1`).
   - Accompanied by `PROVENANCE.md` and `archive-manifest.json` documenting the explicit 2/246 stop boundary, prompt digest mismatch, lack of causal comparability, and complete 176-artifact SHA-256 verification.
3. **`screenshots/`**:
   - Visual presentation evidence of the accepted local Chromium landing page and demo player playback at 20s with native captions (`DemoPlayer.tsx` hash `a39ab7ff5f68d49dbf9fe26402ad91355321cb7b96918d6e91905e5a824cd68b`).
   - Verified in `screenshots/manifest.json`.
   - Desktop snapshot: [`screenshots/landing-desktop.png`](screenshots/landing-desktop.png) — captured at desktop viewport width 1280 (observed image crop: 1216×1886, 438,131 bytes, SHA-256 `654db0b2d65d1a5fc3d96c04cac4d146d7661a0d5af6d59d0fd9d7f759668295`).
   - Mobile snapshot: [`screenshots/landing-mobile.png`](screenshots/landing-mobile.png) — captured at mobile viewport width 390 (observed image crop: 350×3106, 311,922 bytes, SHA-256 `ab469bf9902771b8f41cece5f46acf11fcb37e7f805da8f6ca1726ed6bcbeb45`).
   - Note: Screenshot crop dimensions (1216×1886 and 350×3106) reflect full rendered element/viewport captures and are explicitly distinguished from viewport widths (1280 and 390).
