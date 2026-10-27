# Task 3 Report: Video Guidance & Recovery Improvements

**Date**: 2026-10-26 (Corrected 2026-10-27)  
**Workspace**: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/creative-production-improvements`  
**Base Commit**: `1aecf6c3f3b49c01b2d66cd3afac856d29cc538d`  
**Target Files**:
- `skills/marketing/marketing-demo-video/SKILL.md`
- `skills/marketing/marketing-demo-video/references/capture-edit-recipe.md`
- `skills/marketing/marketing-demo-video/references/rights-cost-checklist.md`  
**Report Path**: `.superpowers/sdd/creative-production-improvements/task-3-report.md`  

---

## 1. Overview & Scope Compliance

Task 3 implemented video guidance improvements adhering strictly to the bounded file allowlist:
- **Owned Files**:
  - `skills/marketing/marketing-demo-video/SKILL.md` (updated, 86 total lines, well within 100-line budget per AC-15).
  - `skills/marketing/marketing-demo-video/references/capture-edit-recipe.md` (updated with shared style/voice context, audio-video muxing, concat assembly, caption retiming, and stream/PTS verification).
  - `skills/marketing/marketing-demo-video/references/rights-cost-checklist.md` (updated with untrusted input governance, operation-specific gating, recovery rejoin, fact classification, and restored storyboard preflight diagnostic boundaries).
- **Report File**: `.superpowers/sdd/creative-production-improvements/task-3-report.md` (updated).
- **Strictly Untouched**:
  - Shared contract (`skills/marketing/marketing-content-strategy/references/creative-production-contract.md`) was frozen by Task 1 and untouched.
  - Storyboard schema (`assets/demo-storyboard.schema.json`) and CLI validator (`scripts/validate-demo-storyboard.mjs`) were unchanged.
  - Evaluation suites (`evals/evals.json`) and companion candidate fixtures were left to Task 4.
  - Generated wrappers, mirrors, indexes, and npm scripts were untouched.
  - No subagents were spawned; no delegation; no commits; no installs; no paid model or media API calls.

---

## 2. Shared Contract Preflight & Consumer Resolution

`skills/marketing/marketing-demo-video/SKILL.md` explicitly incorporates the consumer contract resolution protocol:
1. **Resolution Paths**: Check `<agent-root>/marketing/marketing-content-strategy/references/creative-production-contract.md`, then flattened `<agent-root>/marketing-marketing-content-strategy/references/creative-production-contract.md`.
2. **Missing Contract Handling**: If absent, record `capability_gap: "missing_creative_production_contract"`. Do not attempt silent installation or claim creative-production readiness.
3. **Preserved Standalone Capabilities**: Local `ffmpeg` screen capture recipes and closed storyboard validation continue to operate independently, with limitations disclosed.

---

## 3. Acceptance Criteria (AC) Coverage

| AC ID | Requirement | Implementation Summary & Evidence |
|---|---|---|
| **AC-05** | Missing, duplicate, or misordered narration/clip pairs blocked with offending IDs | In `SKILL.md` (Core Rule 3) and `capture-edit-recipe.md` (§4, §5, §6): manual production review enforces unique scene IDs, monotonic sequential order, resolvable inputs, shared style/voice consistency, scene-specific assignment, per-scene audio muxing, and declared timing constraints. Violations block assembly and emit exact offending `scene_id` values and reasons. |
| **AC-06** | Complete accepted pairs deliver assembled artifact, not loose clips | In `SKILL.md` (Core Rule 4) and `capture-edit-recipe.md` (§6.2, §6.3): when pairing and per-scene muxing pass and `ffmpeg` is available, delivery MUST name the assembled artifact (`target_artifact`), file hash, synchronized WebVTT captions, and Markdown transcript. Delivering loose scene clips as completion is prohibited. |
| **AC-07** | Unavailable renderer reports capability gap, does not fabricate artifact | In `SKILL.md` (Core Rule 4) and `capture-edit-recipe.md` (§6.4): if `ffmpeg` or assembler is absent or unauthorized, emit `assembly_status: "unavailable"` and structured capability gap `missing_local_assembler`. Fabricating video paths or claiming completion is prohibited. No vendor model or 10-second block lock-in. |
| **AC-08** | Uncertain job completion recovery queries existing ID before resubmission | In `SKILL.md` (Core Rule 5) and `rights-cost-checklist.md` (§3): timeout $\ne$ failure. Set status to `pending_rejoin`, retain `job_id`, and query provider status endpoint before re-dispatching. If provider lacks status query, disclose uncertainty and seek operator approval. |
| **AC-09** | Rejected asset correction preserves unaffected accepted assets | In `SKILL.md` (Core Rule 5), `capture-edit-recipe.md` (§7), and `rights-cost-checklist.md` (§3): when QA rejects a scene, retain all accepted passing scenes in exact prior states (`prepared`, `authorized`, `rejected`, `stale`). Re-mux only the rejected `scene_id` within budget cap, recompile global captions/transcript when duration changes, and re-assemble. |
| **AC-10** | Visually plausible preview without measurable proof leaves claims unverified | In `SKILL.md` (Core Rule 6), `capture-edit-recipe.md` (§8), and `rights-cost-checklist.md` (§4): separate 7 fact categories (`requested`, `produced`, `measured`, `visually_reviewed`, `approved`, `stale`, `unavailable`). Visual playback does not prove container timing or PTS sync; claims require `ffprobe` stream/PTS inspection or artifact text extraction, else marked `unverified`. |
| **AC-12** | No matching authorization blocks tool install, media upload, spend, and publish | In `SKILL.md` (Core Rule 7) and `rights-cost-checklist.md` (§2): zero mandatory fees default. Operation-specific gating rules require verified authority for `tool_install`, `media_upload` (private media consent), `spend_budget` (unit cost + hard cap), and `publish_public`. String assertions (`DEC-xxx`, `permitted_operations`, `assets_cleared`) are unauthenticated assertions. |
| **AC-14** | Instructions in product/reference content treated as untrusted data | In `SKILL.md` (Core Rule 1) and `rights-cost-checklist.md` (§1): external creative briefs, user-submitted scripts, prompt references, and uploaded media metadata are parsed strictly as data, never executed as commands or security overrides. |
| **AC-15** | Skill core satisfies 100-line limit and metadata validation | `skills/marketing/marketing-demo-video/SKILL.md` is exactly 86 lines (well under the 100-line limit), with full procedural and command detail placed in `references/capture-edit-recipe.md` and `references/rights-cost-checklist.md`. |

---

## 4. Scenario Walkthroughs (Synthetic / Hypothetical Reasoning)

*Notice: The walkthroughs below describe procedural reasoning under the updated guidance; they are not claimed observed executions.*

### Scenario 1: Accepted Pairs & Assembled Artifact Delivery (AC-06)
- **Context**: 3-scene terminal walkthrough for campaign `standards-demo-01`.
- **Inputs**:
  - `scene-01`: 6.42s audio (`audio/scene-01.wav`), 6.42s video (`raw/scene-01_video.mp4`), caption cue `cue-01`, approval `APR-SCENE-01@rev-1`.
  - `scene-02`: 7.95s audio (`audio/scene-02.wav`), 9.45s video (`raw/scene-02_video.mp4`), caption cue `cue-02`, declared 1.5s visual hold (`timing_contract.scene-02`), approval `APR-SCENE-02@rev-1`.
  - `scene-03`: 5.10s audio (`audio/scene-03.wav`), 5.10s video (`raw/scene-03_video.mp4`), caption cue `cue-03`, approval `APR-SCENE-03@rev-1`.
- **Reasoning**:
  - Per-scene muxing executes: `scene-01` muxed; `scene-02` visual stream padded with 1.5s `tpad` and muxed with narration; `scene-03` muxed.
  - Manual production review verifies shared terminal style ($\ge 18\text{px}$, dark mode) and voice consistency (48kHz, single speaker, $-1.0\text{ dBFS}$).
  - All narrated scenes have resolvable audio, video, caption cue; `scene_id` unique; order sequential (1, 2, 3).
  - Concat demuxer executes across `scenes/scene-XX_muxed.mp4`.
  - Global `dist/captions.vtt` and `dist/transcript.md` compiled from storyboard JSON.
- **Outcome**: Delivery names `target_artifact: "dist/demo_walkthrough_final.mp4"`, along with SHA-256 hash, `captions.vtt`, and `transcript.md`. Loose clips are NOT delivered as completion.

### Scenario 2: Missing, Duplicate, or Reordered Pairs (AC-05)
- **Case 2A (Missing Input)**: `scene-02` specifies narration text but `audio_asset_ref` is empty/missing.
  - **Gate Result**: Assembly **BLOCKED** with `missing_scene_input: scene-02 requires audio_asset_ref`.
- **Case 2B (Duplicate Scene ID)**: Manifest contains two entries with `scene_id: "scene-02"` (one order 2, one order 3).
  - **Gate Result**: Assembly **BLOCKED** with `duplicate_scene_id: scene-02`.
- **Case 2C (Order Mismatch)**: Manifest lists `scene-03` at order 1, `scene-01` at order 2.
  - **Gate Result**: Assembly **BLOCKED** with `order_mismatch: scenes not monotonic gap-free sequential`.
- **Case 2D (Cross-Scene Swapped Assignment)**: `scene-01` references `audio/scene-02.wav` without an explicit per-scene binding or role.
  - **Gate Result**: Assembly **BLOCKED** with `cross_scene_mismatch: scene-01 assigned scene-02 audio`.

### Scenario 3: Overlong Narration Timing Violation (AC-05, AC-10)
- **Context**: `scene-02` narration voiceover was recorded at 8.20s (`measured_audio_duration_seconds: 8.20`).
- **Visual Clip**: Recorded terminal capture is 6.00s (`measured_video_duration_seconds: 6.00`).
- **Contract**: `timing_contract.scene-02` specifies no visual hold or pad (`declared_visual_hold_seconds: 0.0`).
- **Gate Evaluation**:
  - Measured audio duration (8.20s) > measured video duration (6.00s) + declared hold (0.00s).
  - Audio exceeds visual stream by 2.20s without declared hold/pad.
- **Outcome**: Assembly is **BLOCKED** with:
  ```text
  overlong_narration: scene-02 audio (8.20s) exceeds video (6.00s) by 2.20s without declared hold or pad
  ```
- **Remedy**: Operator must either re-trim narration audio or pad the visual clip using `tpad=stop_mode=clone:stop_duration=2.2` before assembly can proceed.

### Scenario 4: Asynchronous Timeout & Uncertain Job Recovery (AC-08)
- **Context**: Cloud rendering or speech synthesis job `job-voice-7712` is dispatched. Client HTTP connection times out after 120s with no completion payload.
- **Agent Decision**:
  - Timeout is NOT treated as a job failure.
  - Agent does NOT immediately dispatch a duplicate job `job-voice-7713`.
  - Status is updated to `state: "pending_rejoin"`, preserving `job_id: "job-voice-7712"`.
  - Re-query status endpoint: `GET /jobs/job-voice-7712`.
  - If status returns `completed`, retrieve artifact.
  - If provider offers no query endpoint, disclose uncertainty to operator and seek explicit authorization before initiating a second paid submission.

### Scenario 5: Honest Capability Gap Disclosure When Renderer Unavailable (AC-07)
- **Context**: All 3 scenes are fully recorded, muxed, and verified against timing contracts. However, the execution environment is a minimal container lacking `ffmpeg` on PATH and no remote rendering endpoint is configured.
- **Agent Decision**:
  - Agent does NOT invent a dummy `dist/demo.mp4` path.
  - Agent does NOT present loose clips (`scenes/scene-01_muxed.mp4`, etc.) as finished delivery.
  - Agent sets `assembly_status: "unavailable"` and emits structured report:
    ```json
    {
      "assembly_status": "unavailable",
      "capability_gap": "missing_local_assembler",
      "target_artifact": null,
      "scenes_ready": ["scene-01", "scene-02", "scene-03"],
      "mitigation": "Install ffmpeg on host PATH or execute assembly in an authorized container."
    }
    ```

---

## 5. Commands Executed

During Task 3 implementation and follow-up correction passes, only read-only repository inspection commands were run:
- `rtk git status` — inspected worktree status.
- `wc -l skills/marketing/marketing-demo-video/SKILL.md` — confirmed 86 lines (<= 100 line constraint).
- `rtk git show 1aecf6c3f3b49c01b2d66cd3afac856d29cc538d:skills/marketing/marketing-demo-video/SKILL.md` — inspected baseline for exact diagnostic boundary text.
- `rtk git diff skills/marketing/marketing-demo-video` — inspected diff against baseline.

**Explicit Non-Execution**:
Per parallel dispatch instructions, no test, build, lint, formatter, or packaging commands were executed. Live model or media API calls were not made.

---

## 6. Preserved Behaviors & Boundaries

1. **Closed Storyboard Schema Intact**: `assets/demo-storyboard.schema.json` remains strictly closed (`additionalProperties: false`). Production review manifests are maintained as separate review guidance and never injected into storyboard JSON.
2. **Storyboard CLI Intact**: `scripts/validate-demo-storyboard.mjs` remains untouched and functional for standalone validation.
3. **Zero Mandatory Fees Intact**: Local capture and `ffmpeg` remain the $0.00 default path.
4. **Mandatory WebVTT Accessibility**: Synchronized `.vtt` captions on the global video timeline remain mandatory; `.srt` is strictly an optional auxiliary export.

---

## 7. Limitations & Residual Risks

1. **Guidance vs Runtime Enforcement**: The pairing rules, timing checks, and rejoin protocols codified in `marketing-demo-video` provide normative guidance for agents. They do not alter the host runtime or install a background daemon.
2. **Validator Scope**: The existing storyboard CLI validator checks syntax against `demo-storyboard.schema.json`; it does not perform optical/audio stream analysis. Downstream evaluation suites (Task 4) and integration verification (Task 5) test agent adherence to pairing and assembly rules.

---

## 8. Correction Report: Resolution of Independent Review (T3-R1 to T3-R5)

Following the independent review in `.superpowers/sdd/creative-production-improvements/task-3-review.md` (verdict: CHANGES REQUESTED, 5 Major findings), the three owned source files were revised as follows:

| Review Finding | Severity | Resolution Summary | Location in Sources |
|---|---|---|---|
| **T3-R1**: Diagnostic boundaries, claim_ref rules, and package resolution deleted | MAJOR | Relocated the exact original diagnostic boundaries (1 MiB cap, regular file check, symlink/special file rejection, fixed stderr codes, `summary: null` on failure, safe VTT escaping), non-empty `claim_ref` for executed actions, format-only validation, `synthetic: true` disclosure, and standard/flattened package resolution to `rights-cost-checklist.md` §6. Explicitly linked from `SKILL.md` CLI Preflight section. Core kept at 86 lines. | `rights-cost-checklist.md` §6;<br>`SKILL.md` L60–L67 |
| **T3-R2**: Separate narration never muxed into scene clips prior to assembly | MAJOR | Added explicit per-scene audio-video preparation and muxing recipe (§5 in `capture-edit-recipe.md`). Visual hold (`tpad`) and narration trimming/lead-in are applied, and audio is muxed into `scenes/scene-XX_muxed.mp4` using `ffmpeg -map 0:v:0 -map 1:a:0`. Defined stream-copy compatibility prerequisites (matching codecs, geometry, frame rate, sample rate, channels, timebases) before concat demuxer. Required `ffprobe` stream presence verification. | `capture-edit-recipe.md` §5, §6;<br>`SKILL.md` Rule 3 |
| **T3-R3**: Assembly/repair does not rebuild global caption timeline | MAJOR | Clarified subtitle lifecycle (§6, §7 in `capture-edit-recipe.md`): scene clips are muxed without burned-in global subtitles; global `captions.vtt` and `transcript.md` are compiled across the full assembled timeline from the storyboard contract. During selective repair, if a repaired scene changes duration, the global sidecar WebVTT and transcript are recompiled to prevent downstream cue drift, preserving unaffected audio/visual recordings while updating dependent assembly and caption outputs. | `capture-edit-recipe.md` §6.3, §7;<br>`SKILL.md` Rule 5 |
| **T3-R4**: Shared style/motion/narration and voice consistency missing | MAJOR | Added dedicated guidance for shared style context vs per-scene motion/narration constraints (§4 in `capture-edit-recipe.md`, Rule 2 in `SKILL.md`). Defined global visual theme (16:9, JetBrains Mono $\ge 18\text{px}$, dark mode high contrast, uniform padding) and global voice profile (48kHz, mono/stereo, speaker profile, target pacing ~130–150 wpm, $-1.0\text{ dBFS}$ peak). Added cross-scene consistency audit steps and honest disclosure for unavailable voice synthesis (`voice_synthesis: "unavailable"`). | `capture-edit-recipe.md` §4;<br>`SKILL.md` Rule 2 |
| **T3-R5**: Duration-only probes insufficient sync/PTS evidence | MAJOR | Replaced duration-only probe with detailed stream, codec, and packet PTS inspection commands in `capture-edit-recipe.md` §8 and `rights-cost-checklist.md` §4. Probes stream `start_pts`, `start_time`, `time_base`, and packet PTS timestamps to detect start offset drift. Bound all measurements to artifact path and SHA-256 hash. Classified container duration equality as insufficient proof of sync; marked sync as `unverified` when tooling lacks deterministic extraction. | `capture-edit-recipe.md` §8;<br>`rights-cost-checklist.md` §4;<br>`SKILL.md` Rule 6 |

**Verification & Invariants Check**:
- Core lines: `skills/marketing/marketing-demo-video/SKILL.md` is 88 lines after the second correction pass, meeting the $\le 100$-line limit.
- No schema, script, eval, or generated files were edited.
- Scenario walkthroughs in Section 4 are explicitly labeled synthetic/hypothetical reasoning.
- All 5 review findings resolved within the exact 3 owned source files and this report.

---

## 9. Correction Pass 2: Resolution of C1–C4 (2026-10-27)

Supersedes the T3-R2/R4/R5 "resolved" claims in §8 where they exceeded the actual command scope. Corrections are static guidance/command changes in the three owned sources plus this report. No ffmpeg/ffprobe command, renderer, provider call, test, build, lint, formatter, schema/script/eval edit, or shared-contract edit was executed or made.

### Dispositions

| Finding | Status | Current evidence |
|---|---|---|
| **C1** mux truncates declared holds; lead-in offset unimplemented | Addressed in source | `capture-edit-recipe.md` §5 now declares a per-scene timeline (`trim_start_seconds`, `trim_end_seconds`, `narration_start_offset_seconds`, `declared_visual_hold_seconds`, `scene_duration_seconds`). Step 2 gates overlong narration before any build/mux; Step 3 builds audio with `atrim` + `asetpts` + `adelay=...:all=1` + `apad` and bounds with `-t`; Step 4 builds visual with `tpad` and `-t`; Step 5 muxes with `-t <scene_duration>` and no `-shortest`, after the gate proved narration fits. `SKILL.md` rule 3 states the same prohibition. |
| **C2** normalization fallback cannot make streams concat-compatible | Addressed in source | `capture-edit-recipe.md` §6 Step 2 lists the common declared parameters (geometry, SAR, fps, `-video_track_timescale`, sample rate, one channel layout) and provides an actual conformance re-encode (`scale`/`pad`/`setsar`/`fps` plus `aformat` channel layout), with re-probe before concat and `capability_gap: "missing_concat_conformance"` when parameters cannot be met. `SKILL.md` rule 4 now requires conformance or a capability gap. |
| **C3** unrequested fixed house style | Addressed in source | `SKILL.md` rule 2 and `capture-edit-recipe.md` §4 now derive style/voice/geometry/pacing from the approved brief or existing assets. Only terminal readability/contrast remain mandatory. Font/theme/margins/pacing are labeled configurable presets; loudness normalization is an optional example tied to a brief target. §1–§3 commands are parameterized (`$DEMO_W/$DEMO_H/$DEMO_FPS/$AUDIO_RATE/$AUDIO_CH`) and labeled example presets. §4.3 compares scene variation to approved intent rather than rejecting it mechanically. |
| **C4** first-second final PTS does not prove later scene/cue sync | Addressed in source; onset distinction corrected in §10 | `capture-edit-recipe.md` §8 now binds evidence by SHA-256, reports per-scene stream facts, and probes packet PTS at each scene's computed final-timeline interval (`SCENE_START`/`SPAN` via `-read_intervals`), checking track coverage against the declared scene origin/end. Narration content onset is separated: leading `adelay` silence keeps the stream at the scene origin, so onset needs artifact-bound content evidence or stays `unverified`. `rights-cost-checklist.md` §4 and `SKILL.md` rule 6 scope the evidence the same way. `capture-edit-recipe.md` §6 Step 4 and §7 require cue/boundary re-verification after recompile/repair. |

### Preserved behavior (unchanged by this pass)
- Checklist §6 diagnostic/input boundaries, `claim_ref`, format-only validation, and `synthetic: true` disclosure remain intact.
- Global WebVTT + transcript compilation and the recompile-on-duration-change rule remain; unaffected scene media is preserved across repair.
- Real repository execution grounding, untrusted-reference handling, spend/rights assertions vs authenticated authority, recovery rejoin, and no-fabricated-artifact rules remain.
- Core is 88 lines, within the 100-line budget.

### Commands actually run
- File reads of `AGENTS.md`, `parallel-briefs.md`, `task-3-review.md`, `task-3-report.md`, and the three owned sources; targeted `edit` replacements. No shell command was executed in this pass (one proposed `sed` edit was replaced with the edit tool after denial).

### Limitations
- All ffmpeg/ffprobe/shasum commands are static example guidance; none were executed against fixtures or media in this pass. No output, timing, or synchronization result is claimed as observed.
- `-read_intervals` keyframe/container behavior on stream-copied artifacts is described as a limitation, not measured.
- The unchanged closed storyboard schema enumerates only `1920x1080`/`1280x720`, 16:9, 24/30/60 fps, and 44.1/48 kHz; the recipe now discloses that a deliverable outside those values cannot be represented in the closed contract. No schema change was made.
- Metadata validation, packaging, eval/scorer execution, and rendering remain unrun and are deferred to the integration owner. Human maintainer approval remains required.

---

## 10. Correction Pass 3: C4-residual (stream start vs narration onset), 2026-10-27

Static source correction only. No ffmpeg/ffprobe execution, rendering, tests, builds, lint, or formatters.

**Defect**: `adelay=500` inserts leading silence, so a correctly built scene's audio track spans the scene origin; its speech begins 0.50s later. Prior guidance told the reader to expect audio `start_time` == `narration_start_offset_seconds` and the first audio packet at `SCENE_START + offset`, which false-rejects valid padded narration and implies PTS can locate speech onset.

**Disposition**: Addressed in source.

| File / location | Change |
|---|---|
| `capture-edit-recipe.md` §5 Step 5 | Post-mux instruction now requires full track coverage (origin to `scene_duration`), replacement of scratch audio, and onset via content evidence or `unverified`; explicitly states `adelay` silence keeps the stream at the scene origin. |
| `capture-edit-recipe.md` §8 Step 2 | Projection adds `pix_fmt` and `r_frame_rate` (previously required by §6 but unmeasured). Checks now require track coverage accounting for reported codec delay/edit-list timestamps; removed the false `start_time == narration_start_offset_seconds` test. |
| `capture-edit-recipe.md` §8 Step 3 | First audio packet is expected at `SCENE_START` (silence-padded), not the narration offset. Added a separate onset rule: only artifact-bound content evidence (measured energy/waveform change at the declared offset, or transcript/caption alignment audited against audio, with method and hash recorded) establishes onset; otherwise `unverified`. |
| `capture-edit-recipe.md` §8 Step 4 | `measured` now includes pixel format and frame rate; final bullet states stream start/packet PTS prove track coverage only, and `adelay` silence is not an onset timestamp. |
| `SKILL.md` rule 6 | States leading silence padding keeps the audio stream at the scene origin; narration content onset needs separate artifact-bound evidence or stays `unverified`. |
| `rights-cost-checklist.md` §4 | Same distinction added to the timing-evidence rule. |

**Preserved**: Valid delayed narration and declared holds are unchanged; `atrim/adelay/apad`, `tpad`, and `-t` construction, overlong gate, conformance, caption recompile, and diagnostic boundaries are untouched. No new silence threshold, engine, schema, script, or eval change.

**Verification**: static reads/edits only. Track-coverage conformance is not claimed until `ffprobe` runs; content-onset evidence methods are examples, not exercised. Core remains 88 lines.
