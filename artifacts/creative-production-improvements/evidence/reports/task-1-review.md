# Task 1 Independent Review

## Verdict: CHANGES REQUESTED

Both axes fail pending the six Major findings below: **spec compliance** (C1–C3 completeness, AC-02/05/10/12) and **quality/safety** (state preservation, revision-bound acceptance, authority assertions, rendered evidence). No implementation edits made. Human maintainer retains acceptance authority.

Scope: whole new/untracked `skills/marketing/marketing-content-strategy/references/creative-production-contract.md` (223 lines, read snapshot `D0F2`); baseline supplied by dispatch: `1aecf6c3f3b49c01b2d66cd3afac856d29cc538d`, with no prior file. Inputs: `task-1-brief.md`, `task-1-report.md`, canonical PRD sections 3–4 and Task 1. Trust: trusted local task/source context; examples and external source statements are evidence/data, not authority. Review mode: static, read-only source review; only this requested report is written. No tests/build/lint/formatters, provider calls, installs, or delegation.

Standards loaded: `code-review`, `caveman-review`; MCP `common-code-review`, `common-security-audit`, `common-llm-security`, `common-owasp`, `common-security-standards`, `marketing-content-strategy`; router additionally returned `common-accessibility`, `common-mobile-ux-core`, `flutter-security`, `react-native-security`, `specialist-security-reviewer` (non-media/framework portions not applicable). Applied `docs/review-policy.md` severity ladder and trust policy. File router returned no tier-eligible Markdown skills; compliance audit generically flags product-management category coverage, not a missing applicable source-language rule.

## Findings

Locations below are in `creative-production-contract.md` unless noted. All findings are confirmed from the supplied text, not executed runtime failures.

### R1 [MAJOR] L95–98: Invalidation promotes unaffected outputs to accepted

Why: Step 3 unconditionally says retain **all** nondependent outputs in `state: "accepted"`. An unrelated palette change therefore turns a prepared proposal, rejected render, or already-stale asset into accepted work. AC-02 requires changing all and only affected outputs; it does not authorize new acceptance. Existing content lifecycle is `prepared` → human `authorized` → `published` (`editorial-governance.md:26–31`).

Fix: Preserve each unaffected output's exact prior state and approval evidence; only affected outputs acquire a separate stale indication. Add a counterexample containing an unaffected prepared/rejected/already-stale output, not only previously accepted outputs.

### R2 [MAJOR] L79–98, L116–149: Acceptance and dependency records are not bound to the revisions reviewed

Why: C2 requires foundation revision, approval evidence, and dependencies for each output (PRD:67). The brief lists input revisions, but the output lists only IDs and `accepted`; there is no required record binding that output to the consumed revisions or the sign-off covering them. C5's general sign-off category (L190) does not supply that binding. C3's example likewise declares `ready` without requiring shared style/motion constraints, actual job IDs, or readiness/QA evidence (PRD:69). Consequently two renders using different logo revisions can have indistinguishable dependency records and stale approval can be reused. The report's field-mapping table does not repair missing requirements in the authoritative reference.

Fix: Require a separate guidance/review record linking each output to consumed dependency revisions, output identity/revision, approval evidence and its scope, and relevant production QA/job/style/motion references. Keep these independent of existing closed storyboard JSON. Explicitly distinguish illustrative review fields/statuses from a new public schema/enum and from the content proposal lifecycle.

### R3 [MAJOR] L152–156: Assembly gate does not reject mismatched or reordered pairs

Why: AC-05 explicitly includes duplicated and misordered narration/clip pairs. Current gate checks missing references, duplicate **scene IDs**, and gaps only. `scene-01` can reference scene-02 audio and scene-01 video, or two scenes can reuse the same audio, while all scene IDs/orders are unique and gap-free. Both pass the written gate. The existence of an `order` property alone does not require audio, clip, caption and assembly sequence to agree.

Fix: Require matching scene identity for actual audio/clip/caption associations, reject duplicate/cross-scene pair assignments, verify explicit order against the planned and assembled sequence, and report offending IDs before readiness. Include a swapped-pair negative example with otherwise valid IDs. Require timing/QA evidence rather than trusting `pairing_status: "paired"` or `render_readiness: "ready"` alone.

### R4 [MAJOR] L30–64: Brief omits required rights/direction/proof context and does not map existing copy vocabulary

Why: C1 requires rights/consent context and approved creative direction (PRD:65); neither is required in the prose or shown structure. The task brief also explicitly requires mapping `proof_bindings`, but that term does not occur in the reference. Existing `content-mapping.md:21–28` places CTA at `action.primary_cta` alongside `proof_bindings.claim_refs/source_refs`; the new example relocates it to `exact_copy.primary_cta` without explaining preservation/mapping. An apparently complete brief can therefore bypass proof context or be needlessly re-requested when supplied in the existing shape. `task-1-report.md:32` claims a proof-binding mapping not present in the deliverable.

Fix: Require reuse of existing campaign/asset/proof records, preserve `asset_id`, `context_revision`, `channel.format`, `action.primary_cta` and `proof_bindings` semantics, and state that the illustrative creative brief supplements rather than replaces them. Require references to approved direction and applicable rights/consent evidence, reporting consequential gaps rather than treating absent fields as cleared.

### R5 [MAJOR] L62–71: Spend assertion is presented without the existing real-authority distinction

Why: Spend permission is described as requiring an explicit `authorization: "DEC-xxx"`, but unlike `marketing-demo-video/SKILL.md:30–34` and `rights-cost-checklist.md:13,18–26`, this shared contract never says DEC strings, rights flags, or `permitted_operations` are input assertions rather than authenticated human/host authorization. Its warning about `context_revision` at L81 does not cover those fields. A complete-looking brief can satisfy the written spend inputs with a self-asserted DEC token; rights provenance safeguards are also not carried forward or explicitly delegated. This is a safety-guidance regression, not proof of an executed unauthorized action.

Fix: Explicitly require matching operation-scoped human/host authority independent of brief assertions; missing authority holds the action. Preserve/refer to existing rights/provenance and hard-cap checks. Clarify that this document and its JSON examples grant no upload/install/spend/publish permission or legal rights.

### R6 [MAJOR] L188, L194–201: Source-level comparison is not proof of rendered exact copy/font fidelity

Why: AC-10 requires exact color/font/copy/timing claims to remain unverified without measurable evidence. L196 names automated copy diffs as deterministic proof but does not bind them to the actual rendered deliverable; a correct source string can render with missing glyphs, truncation, wrong font/weight, or distorted text. Font verification is warned about at L195 but no positive evidence requirement is defined beyond disclosure of unavailable fonts. A source diff and plausible preview can therefore be reported as exact rendered fidelity.

Fix: Separate source/document checks from rendered-output checks. Require evidence tied to the delivered artifact for exact text, font/weight, color and timing claims; source strings, requested font names and visual plausibility alone do not prove those properties. If the available renderer/checker cannot establish a property, mark it unverified/unavailable rather than overclaiming.

## Both review axes: retained strengths and remaining observations

- Spec compliance already present: canonical standard/flattened resolution and explicit missing-contract gap (L7–19); no injection into closed storyboard JSON (L113–114); unused-palette counterexample (L100–107); timeout retains job identity and no-status-provider escalation (L165–169); selective repair and budget bound (L171–175); missing assembler honesty (L155–156); editable/font limitation disclosure (L198–201); vendor predictions and hostile-reference boundaries (L211–219); real-demo grounding (L221–223).
- Quality: examples should be explicitly labeled **synthetic, not executed, not accepted and no real artifacts/sign-offs**. Current JSON asserts measured-looking disclaimers, paired files and ready/accepted states without that label. The report calls its scenarios review-only, but consumers may load only the shared reference. Add this disclosure while revising R2/R6.
- Preserve existing WebVTT delivery expectations: L204 introduces SRT as equivalent while the existing demo-video core/checklist require WebVTT. Clarify the canonical baseline and optional additional export rather than silently weakening it.
- Attribution: L3 names pinned upstream projects/commit and distinguishes instructions from efficacy, but supplies no source links. Add immutable links to the selected source files. No claim is made here that substantial text was copied or license notices are missing; that would require a pinned text comparison outside this bounded review.
- Provider support: recovery correctly makes unavailable status lookup explicit and requires authorization before potential duplication; no fixed model IDs or clip blocks were introduced. A status string is still review guidance, not a verified provider capability.

## Evidence / verification limits

Read and compared the complete new reference, brief, report, canonical requirements, existing content field/lifecycle references, demo-video core/schema search hits and rights checklist. Used read/search/MCP standards calls only. No behavioral smoke, tests, builds, linters or formatters run, per task restriction; no runtime efficacy or integrated packaging verdict claimed. No findings demand out-of-scope test/eval/source edits by this reviewer. Revisions belong to the assigned implementer; re-review this leaf and reconcile the implementation report afterward.

Cost: host token/pricing telemetry unavailable; no numeric estimate fabricated.

---

## Scoped correction re-review — current verdict: CHANGES REQUESTED

Reviewed complete corrected contract snapshot `2500` (320 lines) and correction report snapshot `78A1`. This section supersedes the initial disposition, not its historical evidence. Scope remains Task 1 only. No tests/build/lint/formatters or implementation edits; only this review report appended.

### Original findings: addressed / not addressed

| Finding | Disposition | Current evidence |
|---|---|---|
| R1 | Addressed | L147–162 preserves exact unaffected prior state and demonstrates prepared, rejected and already-stale counterexamples; L265 also preserves prior states during repair. |
| R2 | Addressed at guidance level | L116–145 requires output identity/revision, consumed revisions, scoped approval and job/style/motion references; L187/199/214 adds QA evidence. L5/145/169 explicitly distinguishes illustrative review records from public schema, content lifecycle and validator enforcement. No runtime verification claimed. |
| R3 | Partially addressed; remains open | L211–215 and L217–244 add identity/order checks and a swapped-pair counterexample, but replacement rules lose explicit missing-input and unique-scene-ID checks, and introduce overconstraints; see RR1–RR3. |
| R4 | Addressed | L27–35 preserves supplemental record semantics and canonical CTA/proof mapping; L53–71 supplies direction/rights/proof examples; L92–94 requires consequential gap reporting. Minor wording mismatch: L35 calls `proof_bindings` an array, while both the example L68–71 and existing vocabulary define an object containing arrays; correct terminology without changing shape. |
| R5 | Addressed for authority distinction | L96–103 explicitly rejects DEC/rights/operation assertions as runtime authority, requires verified operation-specific authorization and holds missing/exceeded spend authority. Rights context/provenance references are present at L58–62; this remains guidance, not legal clearance verification. |
| R6 | Partially addressed; remains open | L286–292 explicitly separates source diffs from rendered proof and requires unverified/unavailable classification for unsupported measurements. Positive checks now cover text and timing, but still do not require artifact-bound font/weight/color/contrast evidence. See RR4. |

### Blocking correction findings

#### RR1 [MAJOR] L209–215, L247: Restore missing narration inputs, unique IDs and acceptance prerequisites

Why: The previous explicit rule that every narrated scene must have audio AND visual references has disappeared. “Every audio track ... MUST belong” constrains existing tracks, not their existence. Likewise order uniqueness is not scene-ID uniqueness: two entries with `scene_id: "scene-01"`, orders 1 and 2, and distinct media can satisfy the listed identity/order rules. L247 now conditions completion on passing pairing rather than the previous accepted-scenes condition, so a correctly paired but brand-rejected scene is not expressly blocked. These are concrete AC-05/06 regressions, not an executable-validator claim.

Fix: Explicitly require narration's audio/visual inputs, unique scene IDs and valid required references, and current scene approval/readiness evidence before assembly/delivery. Report offending IDs/reasons. Keep narrated-scene requirements conditional on narration being required.

#### RR2 [MAJOR] L212: Ban duplicate scene assignments, not all shared media files

Why: “Two scenes MUST NOT reference the same audio file or visual clip” rejects legitimate edits using distinct ranges of one recording, recurring brand footage, or shared background audio. The plan requires matching one-to-one scene pair assignments, not globally unique source files. This correction overgeneralizes the prior R3 request to reject duplicated/cross-assigned pairs.

Fix: Distinguish scene-specific pair identity and selected media ranges/roles from reusable source-file identity. Block accidental duplicate or mismatched assignments while allowing explicitly planned, reviewed reuse that preserves correct pairing and order. No new storage/schema is required.

#### RR3 [MAJOR] L214: Remove the universal duration-delta readiness threshold

Why: The new mandatory audio/video duration difference ≤0.15 seconds is not specified by the plan or original finding. A valid six-second narration over an eight-second clip with an intentional two-second visual hold fails, while two equally long tracks with an actual cue offset can satisfy duration equality. Duration similarity alone is not synchronization evidence and this universal bound rejects legitimate edited scenes.

Fix: Use intended scene timing and documented cue/offset/hold requirements to assess actual exported alignment. Require appropriate evidence against those requirements, not a newly invented universal tolerance. Do not replace 0.15 seconds with another arbitrary threshold.

#### RR4 [MAJOR] L280, L286–297: Complete rendered exact-property evidence requirements

Why: R6's source-diff distinction is fixed, but L289–292 only specifies copy and timing measurement. Font/weight, exact color and contrast remain without the required artifact-bound verification rule; the old explicit warning that visual plausibility cannot prove exact color/font metrics was removed. The report L112 claims font metrics and contrast verification were mandated, which the current reference does not say. Also OCR/bounding boxes/pixel sampling at L290 must not be treated as interchangeable conclusive proofs: text bounds alone cannot distinguish two different same-size strings. AC-10 requires the actual claimed property to remain unverified without sufficient evidence.

Fix: Explicitly cover rendered font/weight, color and contrast alongside copy/timing; require checks appropriate to each claimed property on the delivered artifact. Treat heuristic/OCR observations with their limitations, not as blanket exactness proof. If sufficient evidence is unavailable, label the property unverified. Reconcile the report with the actual rule.

### Prior observations and preserved behavior

- Synthetic labeling: addressed at L5 and section headings/notices; examples explicitly are not executions, approvals, or public schema.
- WebVTT baseline: addressed at L299–302; SRT is auxiliary only.
- Immutable attribution URLs: addressed at L3 at pinned package-directory level. No copied-text/license finding established.
- Conditional provider status support and no-status escalation remain at L257–261; no runtime efficacy inferred.
- Capability gap/resolution, standalone validator boundary, selective repair, hostile-input treatment, vendor-proxy classification and real-demo grounding remain present.
- Permission wording ambiguity introduced at L101: “never transmit private assets to third-party endpoints” reads as an unconditional ban even after verified upload consent. Clarify “without matching verified consent/authority” if authorized uploads are intended; this does not reopen the resolved assertion-versus-authority defect.

### Both review axes and next action

**Spec compliance: not accepted** — AC-05/06 prerequisites and AC-10 rendered-property requirements remain incomplete. **Quality: not accepted** — universal file-reuse and duration restrictions introduce valid-input rejection. R1/R2/R4/R5 and the three prior presentation/compatibility observations are resolved; R3/R6 remain partial. Return RR1–RR4 to the owner, reconcile the correction report, then re-review this same leaf. No later-task scope or runtime checks requested here.

Compliance audit repeated before report delivery; loaded standards unchanged. Static evidence only; no tests or smoke checks run under the explicit review restriction. Host token/pricing telemetry unavailable.

---

## Second scoped correction re-review — CHANGES REQUESTED; dependent readiness gate not yet clear

Inputs: complete contract snapshot `48B5` (357 lines), report snapshot `F987` §8, and remaining RR1–RR4. Only this report appended. No tests, source edits, provider calls or delegation. Prior resolved findings are not reopened.

| Remaining item | Disposition | Evidence in current contract |
|---|---|---|
| RR1: required narration inputs, unique scene IDs, approval | Addressed | L225 explicitly blocks missing/empty/unresolvable audio, visual and caption inputs for required narration; L226 separates unique scene IDs from ordering; L229–230 blocks missing/stale/rejected/revision-mismatched approval; L282 requires all checks before completion. |
| RR2: shared-source overconstraint | Partially addressed; still Major | L227 permits shared files and selected ranges/roles, but explicitly rejects **identical ranges assigned to different narrations** without an intentional visual-reuse exception; L279 repeats that ranges must not overlap identically. See remaining finding below. |
| RR3: invented duration threshold | Addressed | L228 replaces universal tolerance with declared offsets/holds/drift constraints and exported evidence; L221 correctly explains the valid unequal-duration scene-02 example. No replacement arbitrary threshold introduced. |
| RR4: rendered-property evidence | Addressed at guidance level | L324–329 binds checks to artifact path/hash, distinguishes text from typography, specifies resolved fonts/text-run mapping plus rendered inspection, color/contrast sampling caveats, exported timing and unsupported-property disclosure. Report §8 reconciles earlier overclaims at L139–141. |
| `proof_bindings` shape | Addressed | L35 correctly states object containing arrays. |
| authorized upload wording | Addressed | L101 scopes consent to recipient and asset revision and prohibits transmission without that matching authority, rather than universally banning authorized uploads. |

### Remaining [MAJOR] RR2 — L227, L279: Intentional identical visual-range reuse is still rejected

Why: Two accepted scenes may intentionally use the same six-second brand-background clip range while each has its own correct narration, captions, timing and scene approval. Both scene-specific assignments are valid; the visual background is deliberately repeated. The current unconditional rejection of “identical ranges assigned to different narrations” rejects this valid case even with explicit reviewed role bindings. L279's nonidentical-range condition reinforces that rejection. This is the same valid-input overconstraint identified in RR2, narrowed from all shared files to shared identical ranges, not a new task requirement.

Fix: Distinguish accidentally duplicated/mismatched scene-specific narration/pair assignments from explicitly planned and reviewed recurring visual/background assets. Permit intentional identical visual-range reuse when its role, timing and per-scene pairing are correct; keep rejecting unbound or mismatched duplication. No arbitrary threshold, new schema or engine needed. Reconcile §8's RR2 claim after the change.

### Nonblocking correction example observation

L178 declares scene-01 “no hold”, while L193 records a 0.08s visual hold and L194 calls it within declared constraints. Align the synthetic declaration and measurement or explicitly state their different meanings; do not infer a new tolerance from this example. The general timing invariant at L228 remains correct.

### Spec/quality verdict and readiness

**Spec axis:** RR1/RR3/RR4 and the minor corrections now satisfy their scoped guidance requirements; no additional missing-input, approval or exact-property blocker found. **Quality axis:** not accepted while RR2 still rejects deliberate recurring visuals. **Overall:** CHANGES REQUESTED; do not freeze this leaf as the final contract for dependent parallel authoring yet. One narrow substantive correction remains (RR2); the example discrepancy is nonblocking. No later-task behavior, runtime efficacy, packaging or tests reviewed.

Compliance audit repeated before delivery; loaded standards unchanged. The owner's report of JSON parsing is not independently executed or adopted as runtime proof. No tests/smoke run under this review's explicit restriction. Host token/pricing telemetry unavailable.

---

## Final scoped leaf re-review — PASS; Task 1 dependent-authoring readiness gate clear

Scope strictly limited to residual RR2 and the synthetic scene-01 hold contradiction. Inputs: contract snapshot `C301` (376 lines), relevant corrected ranges including complete L227 and §4.5; owner report snapshot `C6B5` §9. This disposition supersedes the preceding pending verdict; previously closed findings remain closed.

| Remaining item | Disposition | Evidence |
|---|---|---|
| RR2 residual: identical recurring visuals rejected | Addressed | L227 explicitly permits intentionally identical source ranges with reviewed per-scene bindings/roles, narration, timing and QA/approval; rejects unbound/swapped/mismatched assignments rather than file/range equality. §4.5 L264–298 demonstrates two scenes using the same background range `2.0–8.42`, distinct narration ranges and individual timing/approval references; L298 explicitly accepts that equality. |
| Synthetic scene-01 hold contradiction | Addressed | L178 declares no hold; L190–193 now records audio/video durations both 6.42s and visual hold 0.0s. No tolerance introduced. |

**Spec verdict: PASS for the tracked Task 1 findings. Quality verdict: PASS for the tracked Task 1 findings.** No remaining blocking finding from R1–R6 / RR1–RR4 or the tracked observations. No blocking regression found within these final corrections. Owner report §9 accurately supersedes the prior identical-range prohibition.

**Readiness:** Task 1's shared-reference review gate is clear for dependent parallel authoring against this reviewed leaf. This is not final integrated acceptance, human release approval, packaging verification, provider authorization, or runtime efficacy evidence; subsequent integration/evaluation gates remain with their assigned owners.

Only this report appended. No tests, source edits, builds, lint, formatters, provider calls or delegation. Compliance audit repeated; loaded standards unchanged. Owner-reported JSON parsing was not independently rerun or treated as behavioral proof. Host token/pricing telemetry unavailable.
