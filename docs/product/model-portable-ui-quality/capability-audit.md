# Model-Portable UI Quality: Capability Audit

Status: assessment delivered; source and protocol review passed, not empirical acceptance
Trace: BRD-OBJ-001; REQ-001/004; AC-001/006
Scope: current web UI guidance and evaluation evidence; no source changes or empirical generations.

## Decision And Evidence Boundary

Retain the existing canonical UI guidance while preparing a controlled rendered-output comparison. Inspected sources already cover product grounding, contextual typography/density, preservation, human creative authority, accessibility and comparative browser verification. Another general anti-slop owner would duplicate these responsibilities.

The confirmed limitation is evidentiary: inspected UI evaluation checks response text, not a running interface. No inspected evidence establishes generated-screen quality, cross-provider improvement or reduced repair burden. This does not prove that guidance fails or that rendered evaluation is absent everywhere.

Evidence vocabulary: **confirmed** means directly observed local source; **confirmed, inherited** means the approved BRD's bounded external README inspection, not independently refreshed here; **hypothesis** needs validation; **unknown/unassessed** never means absent. Instruction coverage is not activation, compliance, execution or efficacy. Expert preference is not end-user usability or ROI proof.

Authority: [approved BRD](../../brd/brd-model-portable-ui-quality.md) and [PRD](../../prd/prd-model-portable-ui-quality.md). Read-only author: `7f3afb13-da72-4771-8548-c6322732e893`; packet: `artifacts/runs/model-portable-ui-quality/brief-a.md`. Source revision `d1957d0a121ba386a704eb12130288e8ab675f3c`; packet BRD SHA-256 `6e9e236a7bf33b907cd2e90046edf636e7297c46d67a7cf7c79e2852040f9dcd`; packet PRD SHA-256 `820e278e964336c2c2014388ea906b63a09bf9e796680b246fe099cacdf1062d`. No clean-tree claim. Orchestrator publishes a condensed integration of the returned assessment; author success claims are not acceptance evidence.

## Exact-Source Capability Inventory

Owner denotes existing canonical responsibility, not an appointed individual. All coverage below is confirmed instruction/evidence coverage, not observed generated UI quality.

| Capability / canonical owner | Exact source | Observed coverage | Proof limit |
| --- | --- | --- | --- |
| Ground product direction / UI design | `skills/common/common-ui-design/SKILL.md:23-32` | Audience/task, contextual character and visual purpose; polish default; neutral design valid | Installed selection and model compliance unknown |
| Bind typography/color/density/motion / UI design | Same file `:34-60,72-78` | Platform fonts, hierarchy, tokens, contrast, task-dependent density, reduced motion; rejects arbitrary bans | Tone/motion references not expanded; no runtime observation |
| Preserve identity / human direction | `skills/common/common-ui-design/references/human-direction.md:3-22,32-46` | Keep/change/avoid; polish/restyle/rethink; content/behavior preservation and human approval | No before/after implementation inspected |
| Classify critique / human direction | Same reference `:48-67` | Observation → impact → smallest change → preserve; defect/context/taste; human may retain original | Reviewer calibration/agreement unobserved |
| Bound inspiration / human direction | Same reference `:24-30,69-75` | Borrow/do-not-borrow; references optional; attribution is not efficacy proof | External behavior/license compatibility not established |
| Protect accessibility / accessibility | `skills/common/common-accessibility/SKILL.md:27-84` | Native semantics, labels, keyboard/focus, contrast, targets, media, screen reader/zoom testing | No DOM/axe/keyboard/screen-reader session; no conformance claim |
| Compare responsive output / web visual testing | `skills/common/common-web-visual-testing/SKILL.md:23-41,49-59` | Before/after screenshots and ARIA, neighboring effects, masks, mobile/tablet, retained evidence | No browser launched; instructions not passed checks |
| Cover interaction states / browser scenarios | `skills/common/common-web-visual-testing/references/scenarios.md:7-75,86-115` | Click, hover, empty, error/recovery, focus, overlay, validation, scrolling/loading, locale/RTL and console/network checks | Catalogue does not establish selected/exercised states |
| Preserve authentic state proof / web visual testing | Parent skill `:44-55` | Populated browser state; renderer-only fixtures have narrower claims; no bypass to manufacture proof | Does not require adding authentication to unrelated tasks |
| Persist appearance context / Stitch | `skills/common/common-stitch-design/SKILL.md:22-70` | DESIGN.md ownership, contrast, preserved originals, variants and justified no-change | Stitch-specific scope; no provider-neutral mandatory format established |
| Check response compliance / UI eval | `skills/common/common-ui-design/evals/evals.json:3-98` | Three polish/restyle/rethink string/regex cases and trigger examples | Landing-page trigger is not generated-screen outcome coverage |
| Report historical UI eval / report | `evals-report.md:1-6,150` | Report labels transcript scope; reported UI 0% baseline / 100% with-skill | Not rescored; percentage is not visual quality or portability |
| Execute text workers / eval executor | `scripts/evals/execute.ts:31-74,146-174` | Model/effort configuration, Codex invocation, answer-only instructions, read-only sandbox arguments | No-tools instruction is not host enforcement; no browser runner established |
| Retain provenance / eval documentation | `docs/EVALS.md:3-14,165-168,218-225,262-264,372-388` | Immutable snapshots, hashes, model/protocol metadata, baseline provenance and transcripts | No run-manifest/verifier audit; runnable-artifact compatibility unverified |

## All Supplied-Reference Dispositions

Reuse the approved BRD's four representative README inspections. Eight repositories remain externally unassessed; no new fetch, code/asset/data import or implementation audit occurred. Local coverage means the identified principle is covered, not equivalence with an external product.

| Reference | Disposition / local owner | Evidence and boundary |
| --- | --- | --- |
| [Impeccable](https://github.com/pbakaus/impeccable) | Adapt principle / human-direction critique + web visual testing | BRD External reference findings: separate critique, technical audit and bounded refinement. No detector import; pattern flags cannot decide taste. |
| [Google DESIGN.md](https://github.com/google-labs-code/design.md) | Already covered for appearance-context ownership / Stitch | BRD findings + Stitch `:54-62`. Generalization beyond Stitch remains a hypothesis; no second mandatory format. |
| [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) | Already covered for contextual direction / UI design | BRD + human-direction `:69-75`. No catalogue import or universal example restrictions. |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Already covered for direction/browser principles / UI design + browser verification | BRD findings. No fixed-height/layout rules, bundled assets or palette adoption. |
| Awesome DESIGN.md | Unassessed | BRD names only; no inferred coverage or recommendation |
| Open Design | Unassessed | No editor/architecture/suitability claims |
| React Bits | Unassessed | Optional future application-resource question; effects do not prove quality |
| emilkowalski/skills | Unassessed | Local motion owner remains authoritative; no external efficacy attribution |
| [Hallmark](https://github.com/Nutlope/hallmark) | Unassessed externally; local attribution already covered | Human-direction `:69-75` confirms inspiration, not external revalidation |
| GSAP Skills | Unassessed | No dependency/import or animation-quality claim |
| Scroll World | Unassessed | No inferred scroll/3D/performance benefit |
| Canvas UI | Unassessed | No inferred rendering architecture, portability or usability benefit |

Separate supplied “do less” screenshot: adapt selective removal of decoration/redundant copy when meaning survives; preserve labels, instructions and recovery. It is not a benchmark. Unsupported conclusions: popularity, visual appeal, richer components, motion or imported restrictions guarantee better UI; all products should converge on minimalism.

## Ranked Owner-Local Leverage

No task-visible generated-screen failure was observed. Benefits below are hypotheses except evidence hygiene. Each possible change requires new authorization; no-change remains legitimate.

| Rank | Finding / status | Existing owner and smallest action | Expected benefit | Cost to abandon | Proof needed |
| --- | --- | --- | --- | --- | --- |
| 1 | Confirmed text-versus-rendered evidence limit | Evaluation owner: retain text boundaries and prepare [rendered protocol](evaluation-protocol.md), not relabel text runner | Makes later claims testable; uplift unknown | Low before execution; retain inventory/current guidance | AC-002–005 review, then authorized runnable artifacts and observed checks |
| 2 | Unknown actual guidance selection/compliance | Selection/eval owners: retain actual selected/supplied guidance identity | Avoid adding rules to fix loading/context/noncompliance | Low; provenance useful even without edits | Classify not-supplied, contradicted, followed-but-poor and model/tool limitations |
| 3 | Hypothesis: explicit task/content constraints help new screens | UI design/human direction: test existing audience/task/keep/change/avoid first | Clarity/content fidelity without style bans | Low as a trial; prompt growth remains maintenance risk | Repeated observed failure despite supplied/followed guidance, then approved per-model comparison |
| 4 | Hypothesis: state/preservation selection prevents attractive broken UI | Browser verification/accessibility: apply existing scenarios before adding rules | Detect focus, recovery, mobile and content regression | Low for rejecting advice; executed review effort sunk | Actual task/keyboard/content/state checks; identify instruction gap before edit |
| 5 | Hypothesis: persistent context reduces brand drift outside Stitch | Stitch/UI design: assess tokens, briefs and current appearance artifacts | Possible continuity without duplicate context formats | Medium if generalized prematurely; low at assessment | Demonstrate drift despite context; bounded comparison plus maintenance review |
| 6 | No demonstrated need for new aesthetic restrictions | UI-design maintainer: retain contextual rules, allow no-change | Avoid context growth/homogenization; no uplift claimed | No rollback while unchanged; quality concerns remain unknown | Honest baseline/candidate outcome, or explicit NOT RUN—not inferred baseline success |

Adoption thresholds remain canonical in the approved BRD; this audit does not change them or execute the minimum 72-output comparison. Baseline defects remain unacceptable even if a candidate is preferred. Expert taste and an operational win threshold do not establish statistical significance.

## Acceptance Evidence And Limits

AC-001: inventory above supplies owners, exact sources, coverage and lookup limits. AC-006: every reference has a disposition; every ranked recommendation carries evidence status, owner, benefit, abandonment cost and proof. Author coverage is subject to separate review and maintainer authority.

Consulted: packet, BRD/PRD; UI design, human-direction and UI eval; accessibility; web-visual skill and scenarios; Stitch skill; targeted eval executor/report and EVALS.md provenance sections. No tests/build/lint/formatters, installs, browser sessions, external refreshes or model runs. No generated application or historical run manifest was audited. Calibration, eligible model set/runtime, reviewers, allowance and experiment authorization remain future prerequisites.

Worker read required bodies directly. Its compliance tool returned zero MCP-loaded skills because direct filesystem reads are not MCP body-return observations; this is a telemetry limitation, not an attestation of execution. Aggregate tokens and monetary cost unavailable. Independent source and protocol review passed; actual model efficacy, empirical generations, and runtime acceptance remain pending.
