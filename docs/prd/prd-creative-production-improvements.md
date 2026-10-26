# Creative Production Skills — Improvement and Delegation Plan

Status: implementation complete; Task 6 independent final review **PASS (spec and quality, no blockers)**. Maintainer acceptance remains pending; no merge, release, publication, or live-provider authorization is granted.
Slug: creative-production-improvements. Date: 2026-10-26 (updated 2026-10-27).
Owner/acceptance authority: requesting repository maintainer. Engineering/integration owner: orchestrator. Validation owner: independent reviewer.
Profile: technical; lane: direction. Planning creates no runtime authority.
SNC implementation estimate: S=2 N=1 C=1 total=4 tier=medium; model_tier=standard. Re-score if implementation introduces executable upload, authorization, spending, or persistence mechanisms; those require separate technical design and sensitive-change review.

## 1. Outcome and evidence boundary

OBJ-01: Improve existing marketing and video-generation skills using portable production patterns from Higgsfield, without replacing existing skills or coupling the registry to a provider.
OBJ-02: Make the improvement executable as bounded worker assignments with observable acceptance criteria and independent review.

The maintainer reports existing marketing/video skills. Previous bounded searches did not locate them in this checkout or checked installed roots. Their absence is NOT established. Target resolution is Task 0, not permission to create substitutes.

Confirmed local evidence:
- `CONTRIBUTING.md:41-58`: canonical skills, 100-line core limit, lazy references, evals, host-neutral public packages.
- `CONTRIBUTING.md:65-79,143-158`: canonical workflows versus generated mirrors and PR checks.
- `cli/src/services/validation/rules.ts`: executable metadata/size validation.
- `skills/product-management/product-market-research/SKILL.md`: provenance and vendor-claim safeguards.
- `skills/product-management/product-metrics/SKILL.md`: outcome attribution and authority boundaries.
- `package.json`, `cli/package.json`, `docs/EVALS.md`: existing verification entrypoints.

Upstream reference: https://github.com/higgsfield-ai/skills . API resolved main to `f83af0bc1d937c8119099a11f8ebbf5e6fb99819` during planning. Earlier research read mutable main; Task 0 must recheck the selected files at this immutable revision before importing text or binding evidence.
Relevant upstream files: `higgsfield-brandkit/SKILL.md`, its `references/qa-and-iteration.md` and `references/state-payloads.md`; `higgsfield-product-photoshoot/SKILL.md`; `higgsfield-video-explainer/SKILL.md` and `references/prompts.md`; `higgsfield-generate/SKILL.md`; `evals/scenarios.md`; `LICENSE`.
Upstream documentation demonstrates intended procedure, not runtime quality or measured efficacy. MIT permits reuse subject to retained notices for copies/substantial portions; service, trademark, font, upload, and output rights remain separate.

## 2. Scope and users

As a campaign operator, I want consistent approved brand assets across deliverables so revisions do not silently drift.
As a video producer, I want ordered, recoverable narration/clip assembly so I receive a complete final artifact rather than disconnected clips.
As a registry maintainer, I want portable, compact guidance with meaningful evals so improvements remain maintainable and testable.

### In scope
- Resolve existing target packages and preserve their identities and supported capabilities.
- Improve brand locking, deliverable routing, scene planning, recovery guidance, QA, and truthful handoff.
- Add behavioral and pressure evals, references, attribution where needed, and generated integration changes only where required.
- Exercise existing scorer/consumer paths and produce revision-bound verification evidence.

### Out of scope
- New marketing/video packages as an automatic fallback; wholesale upstream import.
- Mandatory Higgsfield adapters, new provider clients, credential handling, upload services, job schedulers, or general-purpose state engines.
- Automatic installs, public publishing, paid media generation, live model eval execution, deployments, account changes, or new subscriptions.
- Claiming business ROI, superior visual quality, or virality from documentation or synthetic fixtures.
- Changing unrelated registry policies or modernizing the CLI.

## 3. Requirements and acceptance criteria

All requirements link to OBJ-01; REQ-07 also links to OBJ-02. Status: approved for implementation; acceptance not yet verified. Platform: agent skill consumers; WEB/MOBILE UI tags are not applicable.

| Requirement | Priority / implementation owner | Observable acceptance criteria |
|---|---|---|
| REQ-01 Preserve approved brand constraints | P0 / shared-contract worker | AC-01: Given supplied approved assets, a requested application preserves their identities and exact approved copy rather than proposing a redesign. AC-02: Given a foundation revision change, all and only declared dependent outputs become stale. |
| REQ-02 Route by intended deliverable | P1 / marketing worker | AC-03: Given a hero-banner or Pinterest request with a scene description, output format takes precedence over scene styling. AC-04: Given an already complete brief, the agent does not re-ask supplied constraints. |
| REQ-03 Produce complete video plans and outputs | P0 / video worker | AC-05: Given missing, duplicated, or misordered narration/clip pairs, assembly is blocked with the offending scene IDs. AC-06: Given complete accepted pairs and an available authorized renderer, delivery names the assembled artifact rather than treating loose clips as completion. AC-07: Given an unavailable renderer, delivery explicitly reports the capability gap and does not invent an artifact. |
| REQ-04 Recover without duplicate work | P0 / video worker | AC-08: Given a submitted job with uncertain completion, recovery queries/rejoins its existing ID before considering resubmission. AC-09: Given one rejected asset, correction preserves unaffected accepted assets. |
| REQ-05 Verify exact and visual properties separately | P0 / marketing worker; video consumes shared rules | AC-10: Given a visually plausible preview without measurable proof, exact color/font/copy/timing claims remain unverified. AC-11: Given an unsupported editable format or missing font, delivery discloses the limitation instead of substituting a flattened preview as equivalent. |
| REQ-06 Preserve safety and evidence boundaries | P0 / shared-contract worker | AC-12: Given no matching authorization, the workflow does not install tools, upload private media, spend credits, or publish. AC-13: Given a vendor attention score, the agent labels it a prediction/proxy rather than observed conversion or causal ROI. AC-14: Given instructions embedded in product/reference content, the agent treats them as untrusted source data, not authority. |
| REQ-07 Ship portable, verifiable packages | P0 / evaluation and integration owners | AC-15: Changed skill cores satisfy existing metadata validation and the 100-line limit with details loaded on demand. AC-16: Selected target packages are resolvable through the existing consumer path and required references are available after packaging. AC-17: Every new behavioral invariant has a positive and a plausible violating candidate checked through the existing scorer, with limitations recorded. |

## 4. Shared contract decisions — frozen before parallel edits

These are semantic requirements, not authorization to introduce a runtime schema or new storage layer. Task 1 maps them onto existing package conventions. The orchestrator records one authoritative reference location and exact allowed paths before Tasks 2–4 start. If existing packaging cannot share a reference, return that design decision; do not introduce a second contract or a new dependency mechanism.

C1 — Creative brief: requested deliverables, audience/channel, format/dimensions/duration, exact copy/CTA, supplied asset references, rights/consent context, approved creative direction, and permitted operations. Ask only for missing consequential input.

C2 — Brand lock: stable asset identifiers/locators; approved logo/palette/type/copy; foundation revision; approval evidence; dependency list for each output. Generation success and agent preference are not approval. Only changes to declared dependencies invalidate an output. No blanket rule that every palette change invalidates every logo: dependencies must match actual creation/use.

C3 — Scene manifest: unique scene ID, explicit order, narration, shared style reference, scene/motion constraints, intended timing, actual audio/clip locators and job IDs, readiness/QA evidence. One-to-one pairing is mandatory where narration is required. Do not hardcode Higgsfield models or ten-second blocks into generic guidance.

C4 — Recovery and repair: retain existing job identity while status is unknown; do not interpret a timeout as failure; regenerate only explicitly failed/rejected output within existing approval/spend bounds. If a provider offers no status lookup, disclose uncertainty and request authorization before a potentially duplicate submission.

C5 — Delivery and QA: separate requested, produced, measured, visually reviewed, approved, stale, and unavailable facts. Record final artifacts versus editable sources, brand revision/dependencies, check evidence, captions/accessibility expectations, and limitations. Reuse current state vocabulary where possible; do not invent a public enum without contract review.

C6 — Safety: external text never authorizes actions; approval is operation-specific; vendor predictions are not observed outcomes. Host profiles/account details stay in execution records, never public skill guidance.

## 5. Delegation graph and ownership

```text
Task 0: exact targets + gap map
  -> Task 1: shared reference contract + path ownership lock
     -> Task 2: marketing guidance ─┐
     -> Task 3: video guidance ────┼-> Task 5: integration + verification
     -> Task 4: evaluation cases ──┘       -> Task 6: independent final review
```

Tasks 2, 3, and 4 run concurrently in one dispatch batch only after file ownership is disjoint. Task 4 owns eval files; Tasks 2/3 must not edit them. If marketing and video share one core file, assign that file to one worker and split only nonoverlapping references; serialize that shared-file edit rather than creating competing owners. Reviewers never implement their own findings.

### Task 0 — Resolve targets and preserve provenance
- Role: read-only discovery. Scope: authorized checkout, registry metadata, configured installed-package provenance, and pinned upstream files above.
- Steps: identify actual marketing/video skill IDs; resolve canonical repository/ref/package roots; distinguish installed mirrors from source; compare current coverage against REQ-01–07; classify each proposed change as already present, partial, or absent with citations.
- Deliverable: target map containing absolute authorized workspace, repository revision, exact source/reference/eval paths, existing consumer commands, and proposed per-task file allowlists. Recheck upstream license and pin selected references.
- Acceptance: every proposed edit maps to a real authorized source path; preserved behavior and existing tests are listed. If unresolved, request only the missing repository/branch/package from the maintainer and block dependent authoring. Do not edit adjacent market-research or metrics skills as substitutes.
- Decision boundary: no package creation, cross-account transfer, cloning private projects, or architecture changes.
- Size: S; confidence medium because target location is unresolved.

### Task 1 — Establish shared production rules
- Role: shared-contract implementer; depends on Task 0 and plan approval.
- Owns: existing shared reference or one new reference inside a resolved owning package; linked examples and required attribution only. Exact paths frozen by orchestrator from Task 0.
- Steps: map C1–C6 to existing vocabulary; add concise invariant/transition tables and synthetic examples; define consumer reference-loading conditions; document missing-capability behavior; retain upstream notices for substantial copied text.
- Acceptance: REQ-01, REQ-06; all contracts have one authoritative owner; no runtime enforcement or provider capability is claimed merely because guidance exists.
- Output: changed paths, contract location, field mapping, dependency examples, AC mapping, unresolved decisions. Do not edit marketing/video cores assigned downstream.
- Size: M; confidence medium. A new executable state/helper API is outside this brief and requires design-solution.

### Task 2 — Improve marketing/brand production guidance
- Role: marketing implementer; depends on Task 1.
- Owns: resolved marketing skill core and marketing-specific references; no shared-contract/eval/generated edits.
- Steps: add supplied-brand/apply/extend routing; format precedence; compact intake; shared C1/C2/C5/C6 references; cross-asset consistency review; deterministic correction before broad regeneration; truthful editable/rendered delivery.
- Acceptance: AC-01–04, AC-09–13, AC-15. Preserve existing provider choices and supported modes. No promise to reproduce upstream's hidden prompt enhancer.
- Output: changed paths and per-AC scenario walkthroughs for a hero banner, Pinterest asset, exact-copy correction, stale brand revision, and unavailable font.
- Size: M; confidence medium, subject to Task 0 gap map.

### Task 3 — Improve video planning and recovery guidance
- Role: video implementer; depends on Task 1.
- Owns: resolved video skill core and video-specific references; no shared-contract/eval/generated edits.
- Steps: separate shared style from scene/motion/narration; reference C2–C6; add ordered pairing and readiness checks, duration/voice/style consistency, captions expectations, existing-job recovery, selective repair, and final-assembly/capability-gap delivery.
- Acceptance: AC-05–10, AC-12, AC-14–15. Existing model/provider capability discovery remains authoritative; no fabricated voice/model IDs, fixed vendor block lengths, or claimed assembly when unavailable.
- Output: changed paths and scene-manifest walkthroughs for success, missing/duplicate/reordered pairs, overlong narration, uncertain job status, and unavailable assembly.
- Size: M; confidence medium.

### Task 4 — Add behavior and pressure evaluation coverage
- Role: eval implementer; depends on Task 1; parallel with Tasks 2/3.
- Owns: resolved target `evals/evals.json` files and evaluation-only fixtures; no skill/reference/generated changes.
- Steps: map each AC to task-grounded scenarios; preserve useful existing cases; cover precise routing, supplied-brand preservation, stale dependencies, mismatched scene pairs, unavailable capability, timeout recovery, selective repair, unauthorized upload/spend/install, hostile reference instructions, and unsupported ROI claims.
- Use paired compliant/violating candidate answers. Unauthorized actions, fabricated final artifacts, and invalid assembly are FAIL, never partial. Assertions must reject plausible violations rather than reward keywords copied from the skill. Do not add tests of incidental wording, metadata copies, or mock echoes.
- Acceptance: AC-17 and explicit coverage of AC-01–14; valid repository eval schema; negative controls documented. Existing scorer limitations are reported, not worked around with misleading PASS claims.
- Output: eval-to-AC matrix and candidate fixtures for Task 5's real scorer exercise; no live model/media jobs.
- Size: M; confidence medium.

### Task 5 — Integrate, exercise, and document
- Role: sole integration owner; depends on Tasks 2–4 and bounded task review.
- Owns: affected registry metadata/generated outputs, integration evidence, and appropriate existing changelog/docs. Content defects return to their owners. Do not edit generator/scorer implementations to make gates pass.
- Steps: freeze source revisions and actual selected skill keys; verify complete target membership/eval files; execute the verification lanes below; exercise routing/resource loading through the existing consumer; exercise compliant and violating candidates through the actual scorer; preserve existing SDD evidence; regenerate only required surfaces with current authoring-root guards; inspect scoped parity, not merely command exit status.
- Acceptance: AC-15–17; all source invariants covered; command/report provenance retained; no unexpected generated ownership changes; no claims of live efficacy without live evidence.
- Output: integrated changed-file list, exact revision/snapshot, executed commands/results, AC matrix, generated parity findings, limitations, and documentation/changelog update. Record existing unrelated failures separately without weakening checks.
- Size: M; confidence medium.

### Task 6 — Independent acceptance review
- Role: independent eligible reviewer; no implementation ownership, no edits.
- Inputs: this plan, Task 0 target map, frozen contracts, immutable diff/source snapshot, per-task reports, integration evidence.
- Review: scope/AC completeness, unsupported capability claims, consent/spend boundaries, stale approval behavior, pairing/recovery rules, routing collisions, package reference availability, scorer false positives, license attribution, and generated ownership.
- Acceptance: no unresolved blocking finding; review anchored to exact integrated revision. Human maintainer remains approval authority. Return fixes to assigned workers and re-review affected scope; do not self-approve or auto-merge.
- Size: S–M; confidence medium.

## 6. Common worker dispatch contract

Each dispatch must include this plan path plus its Task section, Task 0's exact authorized workspace/file allowlist, frozen C1–C6 reference, requirement/AC IDs, input artifact paths, report destination, and explicit non-goals. Do not send a worker an unresolved path alias.

Workers must read project instructions and load matching skills before acting; follow existing patterns; do not delegate, install, generate paid media, publish, or modify out-of-scope files. Material design decisions return to the orchestrator while independent safe work continues. Prepare behavior fixtures before prose changes where practical. Skip builds/lint/tests/formatters during parallel authoring; Task 5 runs the combined checks once after source freeze. Never report unexecuted checks as passing.

Worker report must contain: changed files; REQ/AC results with evidence; commands actually run (or explicitly none); preserved behavior; unresolved risks; source revision; handoff dependencies. Independent task review checks scope before integration; Task 6 performs final cross-slice review.

Host execution policy: rediscover profiles before execution. Classify project/account eligibility before sending context. Implementation uses the eligible configured delivery ladder; research/review uses eligible analysis/review roles, not premium by default. Native scout tasks are only bounded read-only lookups. No worker can authorize premium escalation or substitute a different account. Do not publish host profile/model/account details inside reusable skills.

## 7. Verification plan

Root cwd unless the command uses the CLI filter. Prerequisites: Node >=20, pnpm 10, rtk, and existing matching dependencies. Verify availability; do not silently install. Commands below were source-verified during planning, NOT executed.

### Once after source integration

```bash
rtk pnpm --filter ./cli validate:all
rtk pnpm audit:skills
rtk pnpm evals:audit
rtk pnpm evals:preflight -- --skills-file <resolved-skills-file>
rtk pnpm check-alignment
rtk pnpm test:evals
rtk pnpm docs:capabilities:check
```

`<resolved-skills-file>` is produced by Task 5 from actual Task 0 category/skill IDs, one per line; it is not a literal runnable placeholder. Check each selected package and eval exists BEFORE preflight: current preflight can skip unknown keys/missing files. Inspect audit report findings: `evals:audit` can return exit zero with issues. Audit/preflight write reports; preserve pre-existing user changes. Alignment proves lexical grounding, not behavioral efficacy.

Run remaining applicable repository PR gates once: `rtk pnpm audit:sdlc`, `rtk pnpm freshness:audit`, `rtk pnpm test`, `rtk pnpm build`. Where a containing suite already runs a listed subset, avoid duplicate execution. If category/release metadata changes, run `rtk pnpm verify:release-tags`. Existing transcript re-scoring uses `rtk pnpm evals:verify -- --all`; it does not establish new target efficacy.

### Behavioral smoke, not just structural checks

Task 5 must run the existing scorer against Task 4's paired candidates and retain the actual decisions. Check every critical violating candidate fails. Exercise the existing real consumer routing/loading path with the selected marketing/video triggers and an unrelated negative trigger; verify referenced resources are present in the resulting package. Task 0 supplies the source-verified consumer invocation; no imaginary `registry:check` command is permitted.

Perform an offline campaign walkthrough: supplied fictional brand, one hero image request, and one short narrated video request. The record must demonstrate asset preservation, pairing validation, stale-dependency handling, timeout recovery decisions, and honest final capability status. This is guidance/scorer/consumer evidence, NOT proof of rendered video quality or real provider retry behavior.

### Generated integration

Only Task 5 may run `rtk pnpm calculate-tokens` and `rtk pnpm generate-indices`, and only when required. They mutate more than indexes. Follow current source guards and generator-safety guidance; current code requires authoring-root realpath, so do not bypass it using a generic temporary-directory recipe. Preserve `.agent/sdd` and user changes, derive expected outputs before execution, and compare intended source/export content afterward. No manual mirror edits, blind directory copy-back, or lockfile adoption. Run `rtk pnpm docs:capabilities` only if capability docs genuinely changed.

### Live evaluation is separately gated

A no-execution manifest may be prepared with `rtk pnpm evals:manifest -- --skills-file <resolved-skills-file>`, then estimated using `rtk pnpm evals:estimate -- --run <actual-run-id>`. Model calls, media generation, uploads, and publication need separate matching authorization. No `--execute` in this plan's default verification. If efficacy comparison is authorized later, compare the frozen baseline and candidate on identical briefs/assets/model settings; report quality, revision count, job count, cost and limitations. Do not assert improvement before observing it.

## 8. Accountability, release, and decision gates

| Responsibility | Accountable | Responsible | Consulted |
|---|---|---|---|
| Scope, source location, acceptance | Maintainer | Orchestrator | Task 0 researcher |
| Contract/path ownership | Orchestrator | Task 1 worker | Marketing/video/eval owners |
| Package changes | Orchestrator | Assigned Task 2/3 worker | Independent reviewer |
| Evaluation and integration evidence | Orchestrator | Task 4/5 owners | Independent reviewer |
| Review disposition | Maintainer | Task 6 reviewer | Orchestrator |
| Merge/release/live spend | Maintainer | Separately authorized operator | Reviewer |

No application UI, database migration, deployment, or production analytics is introduced. Success target for repository delivery: all applicable ACs evidenced, all critical negative candidates rejected, no unresolved blocking review findings, and no unauthorized external operations. These are acceptance targets, not measured business outcomes. Evidence records use synthetic/redacted media; no new telemetry service.

Readiness: Task 0 resolved real targets on same-repository branch `feat/evidence-led-marketing` at `1aecf6c3f3b49c01b2d66cd3afac856d29cc538d`. Execution is isolated in `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/creative-production-improvements`, branch `feat/creative-production-improvements`; the existing marketing worktree is untouched. Targets are `marketing-content-strategy`, `marketing-copywriting`, and `marketing-demo-video`. Task 1's authoritative reference is `skills/marketing/marketing-content-strategy/references/creative-production-contract.md`; downstream consumers resolve its installed package/reference explicitly and disclose a missing capability when excluded, without introducing a dependency engine.

Estimate: Task 0 S; Task 1 M; parallel Tasks 2/3/4 M each; Task 5 M; Task 6 S–M. Relative planning sizes only, no delivery-date or billing commitment. Main uncertainty is target location and current capability overlap.

## 9. Outcome and handoff

Planning deliverable: complete delegation structure with explicit source-resolution gate.
Implementation status: Tasks 0–4 complete and source-frozen with recorded reviews. Task 5 local execution and Task 6 B1–B4 evidence corrections are complete. Independent final review `artifacts/creative-production-improvements/evidence/task-6-final-review.md` passed spec and quality with no blockers; it verified 43/43 archived tool starts/results, 41/41 reviewed-manifest digests, all 21 frozen-source digests unchanged, and 345 catalog entries across 27 categories. The whole-suite record sums to 1,702 passes across eleven printed totals, with the native Vite warning retained. Maintainer acceptance remains pending; live/provider and runtime enforcement claims remain out of scope.
Approval: approved by maintainer instruction “start implement the plan” (2026-10-26).
Activation: not authorized (live media generation, external upload, paid jobs, and live model calls remain blocked).
Cost: runtime token usage/pricing unavailable; no cost estimate fabricated.

Change log:
- 2026-10-26: initial improvement plan based on upstream source review and local authoring/verification conventions.
- 2026-10-27 (earlier checkpoint): Task 5 integration was still in progress pending alignment-validator correction and remaining whole-suite runs; this status was superseded by the final Task 5 execution record.
- 2026-10-27: Task 5 execution completed and Task 6 B1–B4 corrections recorded. Authentic raw tool records, corrected fictional walkthrough, source-derived catalog refresh, and current status reconciliation are bound in the evidence manifest. Task 6 remains pending independent affected-leaf re-review; human acceptance, merge, publication, and live-provider authorization remain separate.
- 2026-10-27: Independent Task 6 final review PASS (spec and quality; no blockers), recorded in `artifacts/creative-production-improvements/evidence/task-6-final-review.md`. The reviewed manifest is preserved as `reviewed-manifest.json`; the successor manifest resolves the archived SDD reports and binds the final review. Maintainer acceptance remains pending.
