# Task 3 Independent Review

## Verdict: CHANGES REQUESTED

**Spec axis: not accepted. Quality axis: not accepted.** Five Major findings below. This is source-guidance review, not evidence of an executed rendering failure. Human maintainer retains approval authority.

## Scope and evidence

Reviewed ONLY the diff against `1aecf6c3f3b49c01b2d66cd3afac856d29cc538d` for:
- `skills/marketing/marketing-demo-video/SKILL.md` — current read snapshot `2582`, 79 lines.
- `skills/marketing/marketing-demo-video/references/capture-edit-recipe.md` — `D330`, 183 lines.
- `skills/marketing/marketing-demo-video/references/rights-cost-checklist.md` — `B46F`, 71 lines.

Inputs: `parallel-briefs.md` shared context and Task 3, `task-3-report.md` (`A02C`), frozen canonical creative contract (`C301`), previously loaded approved PRD Task 3/AC requirements. Trust: trusted local task/source package; external references remain data. Read the actual diff and complete current three source files rather than adopting implementation report claims.

Executed review-package command only: `rtk proxy git diff 1aecf6c3f3b49c01b2d66cd3afac856d29cc538d -- skills/marketing/marketing-demo-video/SKILL.md skills/marketing/marketing-demo-video/references/capture-edit-recipe.md skills/marketing/marketing-demo-video/references/rights-cost-checklist.md` (exit 0). No tests/build/lint/formatters, rendering, provider calls, installs or delegation. No source edits. Only this requested report written.

Standards: `code-review`, `caveman-review`, `common-code-review`, security-audit/LLM-security/OWASP/security standards, `common-skill-creator`, `common-workflow-writing`, file-routed feedback/retrospective rules, `marketing-demo-video`, `marketing-content-strategy`; repository review policy applies. MCP audit completed; its generic Markdown/product-management coverage warning does not establish a missing applicable language rule. No live efficacy, packaging or metadata-validation PASS claimed.

## Findings

### T3-R1 [MAJOR] SKILL.md:57–63 and rights-cost-checklist.md:64–69 — Existing diagnostic and evidence-preflight contract was deleted, not relocated

Why: The diff removes the entire original `Input & Diagnostic Boundaries` section: one regular file/1 MiB limit; symlink/special/unreadable/changing-input rejection; exact fixed diagnostic code set and nonreflection guarantees; rejected-input `summary: null`; unsafe VTT payload controls and escaping. It also deletes the original executed-action nonempty `claim_ref` rule, format-only evidence limitation, and `synthetic: true` no-real-execution disclosure from both core/checklist. Remaining capture recipe L16 merely mentions `claim_ref`; it does not restore those semantics. Task 3 explicitly requires preserving original exact diagnostic/preflight/caption/real-demo rules. The script being unchanged does not preserve the consumer-facing guidance or justify calling it schema-only (L63): baseline documents additional contract/input/serialization checks.

Fix: Restore these exact boundaries in a lazily loaded package-local reference and link it explicitly from core preflight; preserve executable-action claim references, synthetic-evidence disclosure and the distinction between assertion checks and external proof. Stay under 100 core lines by relocation rather than deletion. Restore standard/flattened demo-package resolution detail if moving the CLI section.

### T3-R2 [MAJOR] capture-edit-recipe.md:80–90, 131–144 — Separate narration is never incorporated into the final assembly

Why: The new production record measures separate `.wav` narration and visual `.mp4` files, but the only assembly operation concatenates `scene-XX_captioned.mp4` using `-c copy`. No new step consumes `audio_asset_ref`, applies its selected range/offset, or muxes it into those scene files. The old normalization command can retain captured audio, but cannot introduce a separately generated/recorded narration file it never receives. A silent visual clip with a valid external narration WAV can therefore pass the listed readiness checks and produce a silent final MP4. Likewise wrong preexisting audio in the clip survives concatenation. Naming/hashing that MP4 is not AC-06 assembled narrated delivery.

Fix: Add an explicit per-scene preparation step that consumes the approved audio/visual bindings and declared offsets/holds, produces verified muxed scene clips, then concatenates them. State stream-copy compatibility prerequisites (matching stream layout/codecs/time bases) and a supported normalization path when they do not hold. Require successful assembly plus final-file stream inspection before reporting completion; do not imply concat alone pairs external audio and video.

### T3-R3 [MAJOR] capture-edit-recipe.md:51–58, 135–144, 161–167 — Assembly/repair does not rebuild the global caption timeline

Why: Existing recipe compiles captions globally, while the new concat list consumes individually captioned scene clips without specifying whether those subtitles are scene-local or global. The repair workflow then says replace only one entry and rerun concat. If repaired scene-02 changes duration, scene-03's global sidecar cue offsets become stale unless captions and relevant storyboard scene durations are updated/recompiled. The workflow never requires that. Retaining unaffected media is correct, but retaining old global caption timing is not. AC-06 and preserved synchronized-caption behavior require captions for the actual assembled timeline, including repaired outputs.

Fix: State a consistent scene-local-versus-global subtitle workflow. After approved timing changes, update timing inputs, regenerate the global WebVTT/transcript as needed and validate their alignment against the final assembled artifact; preserve unaffected recordings while rebuilding dependent assembly/caption outputs. Do not reuse a globally offset caption file as though it were scene-local.

### T3-R4 [MAJOR] SKILL.md:34–40; capture-edit-recipe.md:78–123 — Task 3 shared style/motion/narration and voice consistency requirements are absent

Why: Task 3 explicitly asks for shared style separate from per-scene motion/narration and timing/voice consistency. None of the three changed sources defines a shared style/voice reference, per-scene motion constraints, or a review comparing scenes against approved common style/voice. The frozen shared contract requires style/motion references, but resolving it does not supply the video-specific planning/consistency procedure assigned to this slice. Current gate checks IDs, duration and reference existence, so unrelated visual styles or mismatched voices can be paired and accepted without this requested check.

Fix: Add compact guidance in the capture reference for shared approved style/voice context, per-scene motion/narration/timing, and cross-scene consistency review using the actual available capabilities. Record unsupported synthesis/voice capabilities honestly; do not invent provider IDs or add a schema/provider implementation.

### T3-R5 [MAJOR] capture-edit-recipe.md:82–103, 169–183 — Duration-only commands do not provide the claimed synchronization evidence

Why: New scene probes extract only container `format=duration`; the final probe extracts durations/codecs/geometry but no packet/frame PTS, start offsets, sample rate or channels. Equal-duration streams with a shifted narration onset can pass the recipe's duration comparison. Core L49/checklist L61 correctly require stream/PTS inspection, but the concrete new recipe does not perform that inspection or compare exported start offsets/drift against declared cues. Report L49 claims that path covers exact timing, and recipe L181 lists audio sample-rate/channel measurements the shown command does not request. Frozen C3 explicitly says equal durations alone do not prove sync.

Fix: Provide the appropriate stream/packet/frame timing inspection and comparison against declared offsets/holds/cues for the produced scene/final artifact. Bind evidence to its path/hash. Distinguish actual sampled fields from requested/example values; if the available checks cannot establish synchronization, mark it unverified rather than passing based on total durations. No invented universal threshold.

## Preserved strengths / nonblocking notes

- Both standard and flattened content-strategy contract paths plus missing-contract gap/no silent installation are explicit in core L25–28. Standalone capture/storyboard use is retained, and the production record is kept outside closed JSON.
- Real executed repository behavior remains mandatory (core L32–33; checklist L7); hostile external content is explicitly non-authoritative.
- Timed-out job identity, status rejoin, no-status-provider approval fallback, selective repair and operation-specific consent/spend/install/publish gates are present. Assertions are distinguished from real authorization.
- No new fixed duration threshold, vendor model/ten-second assumption or universal shared-source/range ban was introduced. New shared media checks are scene-specific.
- Mandatory WebVTT plus transcript, scene-local compiler/global output distinction, scene caption ordering, terminal size/contrast and no compulsory autoplay remain somewhere in the sources. Caption retiming gap is T3-R3, not a claim that all caption guidance disappeared.
- Core is visibly 79 lines; structural size is within budget. Metadata validation was not run, so report AC-15 is only partially evidenced at this stage.
- The core's relative cross-package Markdown link is not portable to flattened installs by itself, but its explicit preceding resolver instruction prevents treating it as an auto-loading guarantee. Prefer wording that names the resolved contract instead of a potentially broken clickable link.
- Gate language mentions an “operator or automated runner” without establishing an existing runner. Core L63 disclaims pairing enforcement by the storyboard tool; keep review checks explicitly manual unless a verified current tool is named. The description's “Enforces” is procedural guidance, not demonstrated runtime enforcement.
- Report scenario walkthroughs are reasoning, not executed outcomes. In particular “Concat demuxer executes” and `which ffmpeg passes` (report L68–73) are not observed verification: its command log records only inspection/line counts. Label those walkthroughs synthetic/hypothetical and reconcile after corrections.

## Next gate

Return T3-R1–R5 to the Task 3 owner. Correct only the owned video guidance/report; no script/schema/provider/runtime changes required by this review. Re-review the affected source diff before integration. No cross-slice marketing/eval review performed while their owners are writing. Final runtime/consumer/scorer checks remain deferred to the integration owner.

Cost: host token/pricing telemetry unavailable; no numeric cost fabricated.

---

## Scoped correction re-review — CHANGES REQUESTED

Reviewed actual current three source files: core `C59A` (86 lines), capture recipe `AB8E` (268 lines), rights checklist `FC82` (94 lines), plus report `2FC2` §8. Only the tracked corrections and their new breakage were assessed. No tests, rendering, source edits, builds/lint/formatters, provider calls or delegation. Findings below are static command/contract analysis, not claimed observed media output.

### Tracked dispositions

| Finding | Status | Evidence |
|---|---|---|
| T3-R1 | Addressed | Checklist L74–94 restores original exact input/diagnostic/nonreflection/VTT boundaries, `claim_ref` and synthetic limitations; core L63–68 restores package paths and links the detailed reference. Core's “schema only” shorthand remains imprecise but the explicit restored detail makes the substantive boundary available. |
| T3-R2 | Partially addressed; Major remains | Recipe L123–133 now maps the separate narration stream, fixing the original total omission, but `-shortest` loses declared holds, offsets are not applied, and the normalization fallback is insufficient; see C1/C2. |
| T3-R3 | Addressed at guidance level | Recipe L177–188 separates muxed scene media from global caption compilation. L205–221 updates changed storyboard durations, recompiles global sidecars/transcript and reassembles while preserving unaffected recordings. Commands invoke the existing compiler, not a new schema. Correctness still depends on the mux/timing fixes below. |
| T3-R4 | Partially addressed; Major regression | Recipe §4 and core L34–36 now separate shared vs scene-specific context and review voice consistency, but impose unrequested style/profile choices; see C3. |
| T3-R5 | Partially addressed; Major remains | Recipe L227–260 now actually requests stream parameters/start times/packet PTS and binds evidence to path/hash at L263. However probes target only the start of the final artifact, not later scene/cue timing; see C4. |

### C1 [MAJOR] capture-edit-recipe.md:109–133 — Mux command truncates the declared hold and does not implement lead-in offsets

Why: The recipe creates a longer visual for a declared 1.5s trailing hold, then maps its video against a 7.95s narration WAV using `-shortest`. FFmpeg stops when the shorter audio ends, so this is not a recipe for preserving a 9.45s scene with 1.5s post-narration visuals. If visuals instead end first, the same option can truncate overlong narration before the later check. Step 1 mentions audio lead-in offsets, but its command only trims input (`-ss 0.0 -t 7.95`); it adds no offset/silence. Nonzero declared narration onset is therefore not implemented.

Fix: Prepare both streams against the declared complete scene timeline, explicitly applying selected ranges, narration start offset and any required silence/visual hold, then bound output to that declared timeline. Do not unconditionally stop at the shorter raw stream or discard narration before validation. Measure exported scene timing before acceptance; no arbitrary tolerance needed.

### C2 [MAJOR] capture-edit-recipe.md:135–140 — Advertised concat-normalization fallback cannot ensure compatible streams

Why: Step 3 requires matching dimensions/time bases/channel layout, but directs every incompatible clip back to Step 2. That command sets codec/pixel format/rate/sample rate, not width/height, sample aspect ratio, audio channel count/layout or explicit matching time bases. A 1280×720 mono scene and a 1920×1080 stereo scene remain geometrically/channel-incompatible after that fallback. Listing “2 (stereo) or 1 (mono)” is not a requirement that every scene use the same layout. Stream-copy concat is not a normalization operation.

Fix: Pick the common encode parameters from the approved deliverable, require matching stream layout/geometry/time bases, and provide an actual applicable normalization path for mismatches (including size/padding and channel layout where needed), followed by measured compatibility confirmation. Keep the target geometry/layout configurable rather than universally forcing 1080p/stereo. Alternatively hold concat with an explicit capability gap when approved normalization cannot be done.

### C3 [MAJOR] SKILL.md:34–36; capture-edit-recipe.md:81–100 — Shared style is replaced with a mandatory new house style

Why: Core now promotes 16:9 and a 48kHz voice profile into general shared context. The new reference dictates dark-mode theme, JetBrains Mono/Fira Code, uniform `$ ` prompt, 130–150wpm pacing, −1dBFS peak and −16 LUFS loudness; its audit rejects theme/font-size/speaker changes without allowing brief-approved variation. The requested correction was to preserve and check approved shared style, not invent global art direction or numeric voice standards. The pre-existing local terminal recipe's 16:9 example does not authorize applying that geometry to every requested deliverable. A supplied light-brand vertical demo or intentionally multiple-speaker walkthrough becomes invalid for reasons not in its brief.

Fix: Source shared style/voice/geometry/pacing from the approved brief or existing assets; distinguish accessible terminal readability requirements from optional recipe presets. Label any sample font/theme/encoding/loudness settings as configurable examples, not acceptance criteria. Compare scene variation against approved intent rather than rejecting all variation.

### C4 [MAJOR] capture-edit-recipe.md:244–268 — First-second final-file PTS does not establish later scene/cue synchronization

Why: Both packet probes use `-read_intervals "%+1"` on the final output; they inspect its beginning only. Comparing audio/video stream `start_time` at L266 cannot detect scene-02 narration shifted within its own clip, later concat discontinuities or cue drift while the first scene starts correctly. This was the changed consumer-visible timing contract in T3-R5: exported offsets/holds/drift compared to declared scene/cue requirements, not merely global track start alignment. Report §8's claim of full resolution overstates this scope.

Fix: Scope exported timing evidence to each relevant scene boundary/declared cue (via verified scene files and/or appropriate final-timeline intervals), and compare offsets/holds/drift to their declared constraints. State that initial stream PTS verifies only initial stream alignment, not speech content onset or end-to-end synchronization. Unmeasured scene/cue sync stays unverified; do not infer it from equal starts/durations.

### Verdict and next gate

**Spec axis: not accepted. Quality axis: not accepted.** T3-R1 and T3-R3 are closed; T3-R2/R4/R5 remain partial through C1–C4. The owner added the missing mechanisms in prose, but their commands and new mandatory style choices do not yet satisfy the contract. Return these narrow corrections to Task 3; no script/schema/provider implementation requested.

Original rights/consent, real-demo grounding, captions, rejoin and missing-capability protections remain present. Core is within 100 lines; no metadata/runtime validation performed. Compliance audit repeated; loaded review/video standards unchanged. Owner reports are evidence of claims, not independently exercised results. Only this review report appended; host token/pricing telemetry unavailable.

---

## Second scoped correction re-review — CHANGES REQUESTED; one Major timing-verification defect remains

Inputs actually read: recipe `7A58` (280 lines), core `B062` (88 lines), checklist `DE2E` relevant preservation/timing sections, owner report `B71C` §9. Scope: C1–C4 and correction breakage only; prior closed T3-R1/R3 remain closed. No tests, ffmpeg/ffprobe execution, source edits, delegation or other runtime verification.

| Finding | Disposition | Evidence |
|---|---|---|
| C1: hold truncation / absent lead-in | Addressed in construction | Recipe L107–145 gates narration overflow before building; `atrim`/`asetpts`/`adelay`/`apad` creates a 9.45s audio timeline; `tpad` creates the matching visual; mux bounds that timeline without `-shortest`. This fixes construction, not the incorrect downstream onset check described below. |
| C2: concat conformance | Addressed at guidance level | L163–177 supplies actual geometry/SAR/fps/video-time-base and audio-layout conformance, requires remeasurement and holds concat when approved conformance cannot be achieved. Example stereo settings are explicitly substitutable, not universal. |
| C3: forced house style | Addressed | Core L34–37 and recipe L80–101 derive shared context from approved brief/assets, allow intentional variation/multiple speakers and label presets optional. L8–10/34 disclose configurable geometry and existing closed-schema limits. No new mandatory font family/theme/pacing/loudness remains. |
| C4: opening-only timing evidence | Partially addressed | Recipe L240–280 now probes each declared interval, handles seek limitations and labels unmeasured boundaries unverified; however its pass criteria confuse audio stream start with speech onset after silence padding. See C4-residual. |

### C4-residual [MAJOR] capture-edit-recipe.md:145, 257, 272 — Padded stream timestamps cannot equal the nonzero narration onset

Why: The worked command at L120–122 uses `adelay=500` to insert 0.50s of leading silence, then `apad` to fill the scene. The resulting audio stream spans the whole scene starting at its timeline origin (subject to codec/container timestamp handling); its speech begins 0.50s later. L257 instead requires audio `start_time` to equal `narration_start_offset_seconds`, and L272 requires the first audio packet to be at `SCENE_START + narration_start_offset_seconds`. A correctly constructed silence-padded scene therefore fails those rules. Packet PTS identifies packets containing leading silence as well as speech; it cannot identify the first spoken word. The caution at L280 correctly admits that limitation but contradicts the preceding normative tests. This is a concrete new false-rejection/false-proof defect in the correction, not a request for more opening-only probes.

Fix: Separate complete audio-track coverage from content/narration onset. For this padded construction, validate track coverage against the scene origin/end, accounting for reported codec delay/edit-list timestamps; validate narration onset separately with appropriate artifact-bound content evidence or mark that onset unverified. Do not compare stream start/first packet to speech onset or assume inserting silence shifts the stream start timestamp. Update the L145 instruction and report §9's resolution claim consistently. No new threshold or runtime engine needed.

### Nonblocking measurement completeness note

The §8 stream projection at L253 omits pixel format and frame rate although §6 requires `yuv420p` and declared fps. Include the relevant returned fields when documenting that conformance evidence; do not claim those omitted values were measured by this exact projection.

### Spec / quality verdict

**Spec: not accepted pending C4-residual (AC-10 timing evidence). Quality: not accepted pending the same false-rejection/false-proof rule.** C1/C2/C3 are closed; broad per-boundary inspection is now present, so the sole remaining Major is the stream-start versus narration-onset distinction. Original diagnostic/evidence boundaries, caption retiming, approvals/rights/rejoin and real-demo safeguards remain available. Core stays below 100 lines; no metadata or rendering PASS claimed.

Only this review report appended. Compliance audit repeated with unchanged review/video standards. Static source/command analysis only; host token/pricing telemetry unavailable.

---

## Final scoped leaf re-review — PASS on tracked spec and quality findings

Scope limited to C4-residual (stream coverage versus narration onset) and its measurement-field note. Read actual corrected recipe `37FB` L136–149/240–282, core `6ADE` timing/evidence rules, checklist `D921` §4, and report `E9C8` §10. Earlier dispositions remain closed; this section supersedes the pending verdict.

| Remaining item | Disposition | Current evidence |
|---|---|---|
| C4-residual | Addressed | Recipe L145 separates full padded track coverage from content onset; L257 accounts for codec delay/edit-list timestamps and explicitly rejects `start_time == narration_start_offset_seconds`; L272 compares padded-track starts with `SCENE_START`, not speech offset. L274/282 requires separate artifact-bound content evidence/method/hash for onset or leaves it unverified. Core L55 and checklist L63 carry the same distinction. |
| Measurement-field omission | Addressed | Recipe L253 now requests `pix_fmt` and `r_frame_rate`; L279 lists only returned measurement fields. |

No blocking regression found in these scoped corrections. The owner report §10 matches the actual changed rules and explicitly records static-only evidence.

**Spec verdict: PASS for tracked Task 3 source findings. Quality verdict: PASS for tracked Task 3 source findings.** T3-R1–R5, C1–C4 and C4-residual have no remaining blocking disposition. Task 3's independent source-review gate is clear for integration. This is not rendered-output proof, metadata/package validation, integrated acceptance, live-provider authorization or human release approval. Those gates remain separate.

Only this review report appended. No tests, ffmpeg/ffprobe execution, source edits, builds/lint/formatters, provider calls or delegation. Compliance audit repeated; loaded standards unchanged. Host token/pricing telemetry unavailable.
