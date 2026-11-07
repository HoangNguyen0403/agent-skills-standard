# Model-Portable UI Quality — Evaluation Protocol

Status: proposal_only; experiment not run; source and protocol review passed, not empirical acceptance
Trace: BRD-OBJ-001; REQ-002/003; AC-002–005
Scope: synthetic web interfaces; expert paired assessment, not end-user research.

Read-only author: `82401662-27e3-439f-bce5-972fd796cbcd`, packet `artifacts/runs/model-portable-ui-quality/brief-b.md`. Orchestrator publishes this condensed integration of its complete proposed protocol. Authority: [BRD](../../brd/brd-model-portable-ui-quality.md), [PRD](../../prd/prd-model-portable-ui-quality.md). No empirical outcome is inferred from author completion.

## Authority And Finite Bounds

Preparation is approved; UI generation, paid inference, installations, external publication, production changes and user exposure are not. Current `starts_at`, `ends_at`, `budget_cap` and `currency` are null. Null budget forbids execution. Future window ends within 30 calendar days of separately authorized start. Real-user exposure cap: 0. Planned slots: 72; one initial generation and at most two repair rounds per slot, maximum 216 artifact versions. Actual per-invocation time/token/tool-call ceilings and exact budget/window must be frozen and host-enforced before execution; they are currently unresolved, not infinite permissions.

Node v26.0.0 and canonical evidence/investment scripts/schemas were located by the parent, not executed by the author. No initiative product ledger, formal gate result or experiment grant exists. No AUTH/DEC/HYP/EXP/MET/SRC IDs are invented here. Before execution, the owner must establish canonical ledger/record revisions, narrow authority root, current authority, experiment-gate assessment and separate authenticated host consent. Validator eligibility is not permission. Financial ROI is out of scope.

## Hypothesis And Precommitted Decision

Hypothesis: one frozen candidate change set improves task-appropriate UI quality relative to frozen existing guidance across every tested model, without new critical defects or increased median human repair rounds.

Exactly one primary metric: adjudicated candidate wins per model, denominator 12 fixed pairs (six briefs × two repetitions); owner: evaluation owner, actual identity frozen before execution; current status planned, baseline unobserved. Dimension scores are diagnostics, not substitute success metrics.

Supported for bounded adoption consideration requires all 36 pairs resolved; >=8 candidate wins out of 12 for EACH model; ties zero wins; no new critical accessibility/primary-task blocker relative to paired baseline; candidate repair median no greater for any model; no uncontained safety/privacy/authority/protocol breach. Support does not authorize implementation/publication or establish universal portability.

Complete comparison missing any condition: not supported. Missing infrastructure/observation/review or compromised comparison: inconclusive; never shrink denominators. A confirmed critical candidate regression rules out adoption even if remaining evidence is unresolved. Keep absolute baseline and candidate defects visible; winning does not make a defective screen acceptable. Threshold is operational, not statistical significance.

## Frozen Matrix And Controls

This bounded proposal uses exactly 3 distinct pinned eligible models across at least 2 providers: 6 briefs × 3 models × 2 repetitions × 2 arms = 72 outputs, 36 per arm, 36 pairs overall and 12 pairs/model. Additional models require a prospectively authorized revision recalculating output, pair, repair, time and budget bounds; the >=8/12 per-model adoption rule remains unchanged. This satisfies the approved minimum of three models without implicitly expanding this finite proposal. Repeated labels, effort variants or replicas do not establish distinct models. Mutable aliases alone do not satisfy pinning; unavailable immutable versions are a declared reproducibility limit.

Baseline: current canonical guidance at frozen revision. Candidate: same base plus exactly one frozen proposed change set. Candidate selection/implementation is not authorized. Freeze actual provider/account/model/version, actual supported sampling/effort/context/output/seed settings, guidance supplied bytes and hashes, common prompts, source/asset/dependency identities, tool access, browsers, reviewers, randomization seed and finite runtime/resource ceilings. Unsupported/unknown settings stay explicit, not cross-vendor equivalents.

Fresh isolated context for each slot/repetition. Same brief, starter, assets, tools, runtime and repair opportunities in both arms; only guidance differs. No cross-arm memory, artifact leakage, cherry-picking or aesthetic coaching. No extra no-skill arm silently substituted.

## Six Fixed Briefs

All organizations/content are synthetic. English LTR, literal dates independent of clock, local/system fonts, no remote assets/network APIs. Preserve exact facts, labels, identifiers, warnings and disclosures; wrapping allowed. Behavior is local demonstration, never backend/auth/payment proof.

### B1 — Fieldnote: New Landing Page

Audience: small volunteer-group coordinator. Task: compare plans and open Starter signup demo. New-screen tier; practical, welcoming, unhurried. Warm-paper background, dark readable text, restrained green accent; neutral execution valid.

Exact content:
- Brand `Fieldnote`; navigation `Features`, `Plans`.
- Heading `Keep your volunteer shifts in one place.`
- Description `Plan shifts, share updates, and give every volunteer a clear next step.`
- `Shared roster` / `See who is covering each shift.`
- `Shift reminders` / `Send a reminder before a shift begins.`
- `Printable schedule` / `Keep a paper copy at the venue.`
- Starter: `$0 / month`, `1 team`, `Up to 20 volunteers`.
- Team: `$12 / month`, `Up to 5 teams`, `Up to 100 volunteers`.
- Action `Choose Starter`; disclosure `Demo only. No account will be created.`
- Footer `Fieldnote — a fictional volunteer scheduling service.`

Section links work. Choose Starter opens `Start with Starter` dialog containing `Email`, `Continue`, `Cancel` and disclosure. Empty/malformed submit: `Enter a valid email address.` Valid `mira@example.test`: `Starter selected for mira@example.test.` Cancel/Escape closes and restores trigger focus. Capture top/plans/dialog/error/confirmation. No invented proof/statistics; no network state required.

### B2 — Relay Dispatch: Dense Dashboard

Audience: dispatch staff. Task: find North delayed shipments and inspect R-104. New-screen tier; compact, precise, utilitarian; light-neutral surfaces, navy emphasis, status not color-only.

Title `Relay Dispatch`; heading `Shipments`; text `6 shipments`.

| ID | Customer | Region | Status | ETA |
| --- | --- | --- | --- | --- |
| R-101 | Alder Books | North | On time | 09:20 |
| R-102 | Birch Lab | South | Delayed | 09:45 |
| R-103 | Cedar School | North | On time | 10:10 |
| R-104 | Dune Clinic | North | Delayed | 10:30 |
| R-105 | Elm Studio | West | Delivered | 08:55 |
| R-106 | Fern Pantry | North | Delayed | 11:00 |

Labeled Region filter: All/North/South/West. Status: All/On time/Delayed/Delivered. Search label `Search shipment ID`. North+Delayed yields exactly R-104/R-106; search R-104 leaves only R-104. Accessible event-specific `View details` shows all row fields and `Dispatch note: Call receiving desk on arrival.` R-999 shows `No shipments match.` plus working `Clear filters`. No deletion/external dispatch. Oversized decorative KPI conversion is a context concern, not automatically a critical defect.

Observe populated/filtered/empty/details/focus. `?fixture=loading`: `Loading shipments…` for 1,000 ms then rows. `?fixture=error`: `Shipments unavailable.` plus Retry; Retry resolves locally after 1,000 ms. Timing is a deterministic fixture transition, not a recommended assertion sleep.

### B3 — Harbor Workshops: Form And Recovery

Audience: first-time attendee. Task: recover from validation and one local service failure, reserve two seats. New-screen; calm, explicit, reassuring.

Exact content: `Harbor Workshops`; `Reserve a repair workshop seat`; `Bicycle basics — 18 May 2027, 10:00–12:00`; `$15 per attendee`; labels `Full name`, `Email`, `Attendees`; choices 1/2; helper `We use your email only for this reservation.`; action `Reserve seat`; disclosure `Demo reservation. No payment is collected.`

Empty submit: `Enter your full name.` and `Enter a valid email address.` Errors field-associated, focus first invalid. Enter Mira Chen / mira@example.test / 2. First valid submit displays `Reserving…` for 1,000 ms, prevents duplicate submission, then `Reservation failed. Your details are saved. Try again.` Preserve values. Second valid submit waits 1,000 ms then displays `Reservation confirmed`, `Reference: HW-204`, `Mira Chen`, `2 attendees`, `Total: $30`, `mira@example.test`.

Capture untouched/validation/focused error/submitting/failure/confirmation. No actual payment, auth or email delivery.

### B4 — Common Ground Library: Content-Rich Mobile Page

Audience: resident using phone. Task: find booking requirements and expand eligibility. New-screen, mobile-priority but all fixed viewports; civic, legible, straightforward.

Exact content:
- `Common Ground Library`; `Borrow a repair kit`.
- `Borrow tools for small household repairs. Kits are free for library members.`
- `What is included`: `One screwdriver with interchangeable bits.`; `One adjustable wrench.`; `One tape measure.`
- `Before you book`: `Bring your library card and photo identification.`; `Collect and return the kit at the service desk.`; `Keep small parts away from children.`
- `Loan period`: `Borrow a kit for 7 days. Renew once if no one is waiting.`
- `Collection hours`: `Monday–Friday: 09:00–18:00.`; `Saturday: 10:00–14:00.`; `Sunday: closed.`
- `This is a fictional service demonstration.`
- FAQ `Who can borrow a kit?`; answer `Members aged 18 or over can borrow one kit at a time.`
- Action `Check availability`; result `2 kits available at Central Branch.`

Section links work; FAQ keyboard toggle announces expansion; availability reveals exact result. Preserve safety/hours. Observe full/scrolled safety/FAQ closed/open/result/focus. No invented civic claims or filler.

### B5 — Cedar Tasks: Existing-Screen Polish

Audience: coordinator. Task: complete T-202 and inspect completed work. Plain, compact, dependable. Polish only.

Pre-execution prerequisite: materialize, observe and freeze one runnable starter; both arms receive IDENTICAL source bytes. This is a contract, not a claim an existing fixture file was delivered.

Starter: centered single column max-width 720px, system font, background #f4f4f4, text #222222, white rows; `Cedar Tasks` 28px, body16px; header→filters→list→footer; header padding17px, list gap7px, row padding11px. Filters All/Open/Completed, All selected. Native unchecked checkboxes labeled by complete row:
- `T-201 — Publish rota — Due 18 May`
- `T-202 — Confirm room booking — Due 19 May`
- `T-203 — Send volunteer reminder — Due 20 May`

Footer `3 open tasks`. Check T-202: `2 open tasks`. Completed shows only T-202; Open shows T-201/T-203. Uncheck in Completed: `No completed tasks.`

Allow local alignment/spacing/wrapping/type/focus/states. Keep structure, order, copy, controls/behavior, calculations and neutral palette. No sidebar/grid/new features/deleted dates/renaming. Capture initial/check/filter/empty/focus.

### B6 — Nightjar Sessions: Brand-Preserving Restyle

Audience: adults comparing venue events. Task: reserve two Static Bloom places. Restyle only; expressive, nocturnal, editorial. Materialize/observe/freeze identical runnable starter before generation, not an already-delivered file.

Starter: header→intro→event list→reservation panel→footer; max-width960px; background #111318, text #f7f2e8, accent #f2bd51. Wordmark `Nightjar Sessions`; intro `Small-room performances. Listen closely.`
- `Static Bloom — 21 May 2027 — 20:00 — $18`
- `Paper Satellites — 28 May 2027 — 20:00 — $22`

Each Reserve has event-identifying accessible name and selects that event into panel. `Places` choices1/2; action `Confirm demo reservation`. Static Bloom×2 yields `Reservation saved`, `Static Bloom`, `2 places`, `Total: $36`; adjacent disclosure `Demo only. No payment or ticket is issued.` Footer `Nightjar Sessions — fictional venue.`

Allow local/system typography pairing, borders/surfaces/rhythm/emphasis. Keep wordmark, dark canvas/warm accent, copy, event order, structure/prices/flow. No light SaaS redesign, invented events/proof, motion-dependent content/external assets. Capture initial/selected/quantity/confirmation/focus. Expressiveness is valid, not a novelty bonus.

## Anchored Rubric And Calibration

Each dimension independently 0=blocking or clear mismatch, 1=usable with concrete friction, 2=coherent/suitable. No summed slop score. Cite version, viewport, region/state, fact and rationale.

| Dimension | 0 | 1 | 2 |
| --- | --- | --- | --- |
| Task clarity | Required action absent/undiscoverable | Competing misleading emphasis | Task/action/next step clear |
| Hierarchy | Required info obscured/misgrouped | Avoidable scanning | Grouping supports actual task |
| Typography | Required copy unreadable/clipped | Awkward wrapping/hierarchy | Actual content legible/differentiated |
| Spacing/density | Overlap/compression blocks use | Grouping/scan friction | Fits workflow, not whitespace quota |
| Brand fit | Explicit keep/avoid violated | Identity intact, character weak | Coherent neutral or expressive fit |
| Content fidelity | Required fact/disclosure/outcome lost | Facts intact, associations unclear | Exact facts/guidance usable |
| Responsive | Required content/task inaccessible | Usable but awkward | Usable all fixed viewports |
| States | Required state missing/broken/misleading | Working with feedback/focus friction | Complete understandable recovery |

Classify defect (observed objective failure), context concern (task/audience tradeoff; impact hypothesis unless observed) and taste (valid preference, human authority). Critical: primary task inaccessible, keyboard/assistive-tech blocker, inescapable trap, essential safety/price false/inaccessible or severe accessibility hazard. Retain checker severity separately. Hard failures cannot be offset by preference; other defects also stay visible.

Two independent reviewers plus validation owner calibrate BEFORE experimental inspection. Use authorized/synthetic RUNNABLE examples outside the 72 slots; independently rate same states, record disagreements and freeze clarified anchors. Examples: two usable neutral/expressive B1 layouts differ by taste; attractive B2 oversized cards may cause contextual scanning friction; B3 without labels/keyboard submit is objective and critical if blocking; B4 removing child-safety warning is content defect, not good simplification; B6 readable expressive identity is valid. Examples are hypothetical, not scored observations. Actual artifacts/calibration receipts pending; missing calibration blocks execution. Post-inspection rubric change makes cohort exploratory; a new confirmatory cohort needs separate authorization, not favorable rescoring.

## Actual Observation Protocol

Fixed CSS viewports: desktop1440×900, tablet768×1024, mobile375×812. DPR1; initial zoom100%; en-US/UTC; light OS preference. Pin OS, Chromium primary and WebKit secondary. Repeat required task/keyboard flow in WebKit; desktop flow at200% zoom; transitions with reduced motion. Local fixtures only; no live clock/random data. Narrow identical dynamic masks allowed only with rationale, never task/error/focus/price content.

For EVERY final artifact: launch retained app, record exact command/runtime/URL and startup; observe render/loading/console/network; complete exact task and alternate/recovery paths; keyboard-only focus/order/action/dialog escape/return; inspect populated DOM/accessibility tree, names/errors/announcements; screen-reader task with pinned reader; contrast normal text4.5:1, large3:1, relevant controls/focus3:1; non-color cues, alternatives, targets, zoom/wrapping/clipping; pinned accessibility checker output; reduced motion/loading shifts/neighbor effects; exact content/calculations/filter state. Repeat fixed viewports; retain engine-specific failures. Capture full-page plus relevant state-region screenshots and matching DOM/accessibility snapshots, intermediate and final states. Screenshots alone do not prove behavior. Missing required tool/observation is unresolved, not zero violations.

Renderer-only snapshots/source/transcript assertions/mock auth cannot substitute for running tasks. Synthetic fixtures prove no real backend/auth governance.

## Attempts, Repairs And Failure Accounting

One initial invocation per slot, <=2 repair rounds with same model/context. One round = one invocation using consolidated reproducible objective-failure report, not taste coaching. Same report template, ceilings/tools in both arms. No silent operator code edits or stylistic regeneration. Retain all inputs, responses, versions, invocation/observation history. Primary comparison uses last permitted artifact; initial quality descriptive. Resolved defects remain historical; critical regression triggers stop, not rescue.

Repair count0/1/2; per-model/arm median across all12 slots INCLUDING failures exhausting repairs. Infrastructure-unresolved slots are reported separately; no favorable imputation or resolved full-matrix claim. Never-runnable generated outputs exhaust permitted repairs and count2 if both repair rounds executed; if safety stop prevents completion, record actual rounds plus stopped/unresolved status and do not claim complete guardrail comparison.

Generated failure: code-caused startup/blank/missing-declaration/broken-task; consumes slot and repairs, never dropped/replaced. Infrastructure: provider/account/tool unavailable or unrelated browser crash; preserve unresolved, no quality win/loss. Uncertain cause remains unresolved pending evidence. No auto retry-until-success; extra inference after infrastructure failure requires prospectively recorded new authorization/revision, original retained.

## Blinded Review And Reporting

Pair by brief/model/repetition, opaque IDs/random left-right using frozen seed. Two independent reviewers, neither implementer nor candidate author, get brief/constraints/runnable artifacts/required evidence but not arm/model/guidance/conversation/repair count until preference locks. Record findings, dimension scores/preference/rationale before discussion. Third validation owner adjudicates; retain raw judgments and identity-leak/inferred-unblinding limits. Withhold identity, never alter designs/hide defects.

Outcomes: candidate win, baseline win, tie, unresolved. Candidate runnable against baseline generated failure may win with complete observations (reliability-associated, not purely aesthetic). Candidate critical failure cannot beat task-capable baseline. Both unrenderable can tie with TWO failure flags, not passes. Infrastructure/observation/review missing: unresolved. Preference and defect flags independent.

Retain per slot exact brief/prompt/source/dirty/guidance hashes and actual supplied bodies, selection trace, model/account/version/settings, repetition/seed/invocations/times/tools/versions, initial/final/all repair source/startup, captures/DOM/console/network/a11y/task/defect evidence, attempts/diagnoses, random mapping/raw review/adjudication. Restrict arm/model mapping until lock; immutable manifest retained.

Report EACH model's12 slots: wins/losses/ties/unresolved; generated and critical/other defects by arm; initial/final results; repair distribution/median. Diagnostic95% Wilson interval uses resolved wins denominator explicitly; show unresolved bounds confirmed-wins/12 through (wins+unresolved)/12. Neither changes adoption threshold. Brief/repetition clustering and small nonrandom model set limit inference; pooled wins cannot conceal model failure. No end-user usability/causal ROI claim.

Diagnostic causes remain distinct: not-supplied→activation; contradicted→compliance; followed-but-poor→context/rule hypothesis with tool/model investigation; invalid code→generated failure; unavailable browser/provider→infrastructure.

## Stop Controls And Worked Cases

Before start: freeze eligible accounts/models, baseline/candidate, all runnable fixtures (especially B5/B6), calibrated reviewers/adjudicator, browsers/reader/checker/storage, finite resource ceilings/window, ledger/authority gate and authenticated host consent with enforceable stop control. No control means no start.

Stop further generations on confirmed new candidate critical regression, privacy/account/authority breach, reached/unenforceable bound, lost provenance/comparison integrity or infrastructure preventing required observation. Safe evidence preservation only; no score-rescue generation. No real users, payments, production services or outbound signup.

Synthetic consistency walkthrough (not empirical evidence):

| Case | Expected policy |
| --- | --- |
| All pairs complete, model wins8/12,9/12,8/12, guardrails pass | Bounded adoption consideration only |
| Candidate unstartable after two repairs, baseline task-capable | Generated failure + baseline win, all versions retained |
| Browser unavailable for pair | Unresolved, adoption inconclusive; no replacement/pass |
| Valid equal preference | Tie, zero wins |
| Candidate keyboard cannot reach confirmation, baseline works | Critical regression; stop, candidate revision not adoptable |
| Both unrenderable | Tie plus two failures |
| Wins9/12 each, candidate repair median2 vs baseline1 | Not supported |
| Candidate wins but retains baseline non-primary broken control | Absolute defect retained; not automatically acceptable |

## Acceptance Receipt And Next Boundary

Historical protocol receipt (protocol-only delivery): AC-002: anchored dimensions/taxonomy/calibration method specified; actual calibration pending. AC-003: concrete briefs, frozen comparison/provenance specified; actual starters/models/runtime pending. AC-004: observation/hard-gate/failure policy specified; no browser/a11y execution. AC-005: blinded independent equal-opportunity review and per-model uncertainty specified; no ratings/results. Orchestrator and separate reviewer verified the persisted integration.

Current benchmark preparation annotation: Synthetic starters and reference fixtures (B1–B6) with browser smoke verification are now delivered under `benchmarks/ui-quality/` (see `benchmarks/ui-quality/README.md` and `benchmarks/ui-quality/verification-report.md`). However, no experiment outputs, model efficacy, calibration, or screenreader proof exist. The operator has explicitly PAUSED the experiment. Execution gates (model pinning, calibrated reviewers, runtime, and authority) remain unrun.

Proposal-only recommendation: retain current guidance; `recommended_next_workflow: null` until exact candidate, fixtures, model/settings, reviewers, runtime, finite budget/window and authority are supplied; then authorized owner may resume validate-product. Delivery remains requirements_ready, empirical_validation:not_run. No new product IDs, result claims, installations or source changes. Direct skill reads included product experimentation/evidence/metrics/investment, browser verification/accessibility; MCP audit does not attest direct filesystem reads or enforcement. Cost telemetry unavailable.
