# Rights, Provenance, Cost, & Accessibility Checklist

Production checklist for developer demo videos, terminal screencasts, and marketing media assets.

## 1. Rights & Provenance Assertions

- [ ] **Repository Behavior Grounding**: Terminal commands and UI actions reflect real, reproducible repository behavior at the recorded commit revision. No mocked or simulated results.
- [ ] **Code & Output Ownership**: All code snippets shown are under the project's license (e.g. Apache-2.0) or permitted open-source dependencies.
- [ ] **Audio & Music Licensing**:
  - Voiceover is recorded by project contributors or generated via approved local synthesis.
  - Background music and SFX are strictly CC0-1.0, Apache-2.0, or documented royalty-free assets with explicit attribution.
  - No commercial pop music, unverified YouTube rips, or uncredited audio loops.
- [ ] **Assertion vs Verification**: Declaring `assets_cleared: true` in a storyboard JSON is an input contract assertion; it does not replace external legal clearance or formal review.

## 2. Cost Governance & Paid Generative Media Controls (AC-15)

- [ ] **Zero Mandatory Provider Fees**: Primary path is local screen/terminal recording and processing with `ffmpeg` ($0.00 commercial media fees). Developer labor hours and compute resources are tracked separately under project capacity.
- [ ] **Commercial API / Tool Pre-Requisites**:
  - When commercial AI or video rendering services (Runway, HeyGen, ElevenLabs, Synthesia) are requested, the plan must declare:
    1. Exact unit cost schedule (e.g., `$0.10/min` or `$25/month`).
    2. Hard spending cap in USD (e.g., `spending_cap_usd: 50.00`).
    3. Documented decision authorization reference assertion (e.g., `authorization: "DEC-002"`).
- [ ] **Assertion vs Human Authorization**: A DEC string in JSON is an assertion of a recorded decision; it is not authenticated runtime human consent.
- [ ] **Immediate Stop Conditions**:
  - If estimated cost exceeds the spending cap $\to$ **HALT**; do not charge card or API.
  - If authorization reference is missing or null $\to$ **HOLD**; decline paid action and report the missing decision authority.

## 3. Web & Player Accessibility Standards (AC-27)

- [ ] **Synchronized Captions**: Shipped as valid WebVTT (`.vtt`) file adhering to W3C standards with cue timestamps matching speech cues. Cue timestamps must be on the global video timeline; storyboard offsets are scene-local and are resolved by `--format vtt`.
- [ ] **Narrated Scene Coverage**: Every scene containing narration actions declares at least one caption; caption intervals are ordered and non-overlapping within the scene.
- [ ] **Evidence Reference Prerequisites**: Actions asserting an executed step (`terminal_command`, `editor_action`, `ui_interaction`) declare a non-empty `claim_ref`; the reference format is validated only, and a synthetic storyboard must state that no real evidence exists.
- [ ] **Complete Text Transcript**: Markdown or plaintext transcript provided alongside video export for screen readers and SEO indexing.
- [ ] **Visual Readability**: Terminal font size $\ge 18\text{px}$, high-contrast color theme ($\ge 4.5:1$ WCAG AA contrast ratio).
- [ ] **Player Behavior**: No compulsory unmuted autoplay on web landing pages. Controls (play/pause, volume, fullscreen, caption toggle) must be keyboard-accessible.
- [ ] **Delivery Lifecycle**: T06 delivers the reusable skill, storyboard contract schema, and compilation tools (resource readiness). The actual playable captioned export for campaign `standards-demo-01` is produced in T09.
