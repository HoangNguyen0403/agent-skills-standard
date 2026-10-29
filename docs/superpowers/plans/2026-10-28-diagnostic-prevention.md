# Diagnostic Prevention Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development. User selected that approach and approved an isolated worktree. Workers do not delegate, commit, change host policy or run shared generators.

**Goal:** Implement the repository-owned prevention improvements in the approved retrospective and explicitly identify external host controls that cannot be implemented here.
**Architecture:** Extend existing canonical skills, evals and owned runner/generator/MCP boundaries. Keep one owner per shared component; final generation and verification happen only after all writers freeze. No parallel collector, permission simulator, or replacement host dispatcher.
**Tech Stack:** Existing TypeScript/Node >=20, Python3, canonical Markdown/JSON skills and workflows; pnpm10.
**Spec:** `/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard/docs/superpowers/specs/2026-10-28-diagnostic-improvement-plan.md` (approved, outside this fresh worktree; immutable read-only input).

## Global Constraints

- Authorized project: personal agent-skills-standard. Workspace `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`, branch `feat/diagnostic-prevention-improvements`, base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`. Do not edit primary checkout or unrelated files.
- Requirements are candidate IDs S01–S06 and H01–H05 from the spec; no hidden reduction of acceptance. H01 authenticated host resolver and full H02/H04 host dispatcher/process adapters are absent from this checkout: record exact external prerequisites, not fake enforcement.
- No host approval config/profile/account changes, premium calls, external enrollment, paid model trials, live control probes, publish/push/merge or autonomous pilot activation. Generic approval is not authority for those actions.
- Dependencies are symlinked from the same base checkout; do not install/update them or claim lock-exact provenance. Do not mutate dependency trees.
- Prefix shell commands with rtk. Read AGENTS.md and load applicable file/keyword rules before changes. Exported symbol changes require LSP references. Use dedicated edit/read tools.
- Workers may author tests but skip build/lint/test/formatters mid-flight. Parent runs the settled covering gates once afterward. Label original RED NOT RUN where not observed; never manufacture historical RED by deleting guards or rewriting old evidence.
- Focus permanent tests on observable behavior, finite positive/negative invariants and actual boundary failures; no source-wording snapshots, mock echoes or duplicated copies. Eval tests use real checkAssertion scorer.
- Canonical skill bodies remain concise; long contracts go in existing or focused references. Maintain existing eval schema/IDs, add finite held-out pressure/control cases. Do not claim model efficacy from deterministic calibration.
- Reports/evidence for this plan live in `artifacts/diagnostic-prevention/implementation/attempt-01/`, outside `.agent` migration scope. Append failures and correction rounds, never overwrite previous reports. Source files can change until explicit FINAL freeze. No postfreeze edits until parent requests correction.
- Each worker returns changed paths, named AC results, commands NOT RUN or actual evidence, decisions/risks and FINAL state. One corrective follow-up then next eligible implementation route for that slice, per host policy. No recursive delegation/worker commits/full-suite runs.
- Parent owns `skills/metadata.json`, CHANGELOG, root package scripts, generated mirrors/indices and architecture/contributor integration. Workers do not touch those except where a task explicitly owns one source hook.

## Shared contracts and preflight

| Tasks | Interface/shared surface | Ruling |
|---|---|---|
| 1 / 2 / 3 | Evidence directory and frozen revision | Reports outside `.agent`; Task1 helper protects evidence; 2/3 describe same source-ready/check/smoke/review/human state split. |
| 2 / 3 | implement-feature workflow | Task3 sole writer. Task2 changes only SDD package and sends interface notes, no workflow edits. |
| 3 / 5 | common-tdd eval calibration | Task3 sole JSON writer; Task5 calibration test reads final JSON after freeze. No concurrent writing. |
| 4 / 6 | telemetry guidance versus MCP implementation | Task4 declares partial/unknown semantics, Task6 implements existing source counters/rates; no new collector/event schema. |
| 1 / 7 | staging versus registry fixture | Task1 uses fixture public API only; Task7 sole fixture writer. |
| all / integration | metadata, mirrors and final evidence | Parent sole owner after all workers freeze. No generator runs mid-flight. |

All tasks internally agree with their interfaces and tests: missing host APIs remain external, deterministic source checks do not imply skill uplift, and guidance tests must not be reported as model trials. Runtime implementation and host activation remain distinct.

### Task 1: Preserve evidence during migration and generation (H03, S06 tooling)

**Files:** `cli/src/services/SyncService.ts` migration method, `cli/src/services/__tests__/SyncService.spec.ts`, a real filesystem preservation regression beside current lifecycle tests; `scripts/generate-indices.ts`; `.husky/pre-commit`; new focused `scripts/generation/` helper and tests if no existing helper is found.
**Scope / owned write set:** those files only; no canonical skill edits, metadata or mirrors.
**Inputs:** existing install ownership lifecycle, safePath containment and configured `.skillsrc`. **Outputs:** preserved `.agent/sdd` and other active/unknown state; safe staged generation entrypoint and nonzero failures.
**Ingress/invariants:** ordinary writeSkills migration must never remove unknown active data or conflicting content. Conservatively stop automatic `.agent` cleanup entirely if legacy/active classification is not authoritative: preserving user data wins over naming cleanup. Do not silently copy stale artifacts over current ones.
- [ ] Replace blanket copy/remove with non-destructive retained legacy behavior or explicitly bounded verified migration; test real sentinel bytes/path retention, destination conflict and repeat invocation. Existing mock expectations asserting deletion must be replaced, not repinned.
- [ ] Fail generator before mutation when physical cwd differs from script-derived authoring root; propagate caught phase failures to nonzero rather than `.catch(console.error)` success.
- [ ] Implement a repository-owned isolated-generation command that allocates a fresh stage, copies source excluding `.git`, `.agent`, artifacts and dependencies, retains complete mirror inventory, links dependencies explicitly and runs index/token/capability generation there. Baseline all intended destination bytes/absence BEFORE any generator. Only copy back declared generated files with exact before/staged digest checks; reject symlink/foreign/edited destination and concurrent drift. Preserve per-attempt logs and a receipt outside hashed inputs. Check host category ID sets against canonical configured selections, not equality alone. No blanket restore or automatic deletion.
- [ ] Make precommit check-only: validate required prepared outputs using safe staged/check mechanism; no active generation or git add. Do not disable the hook.
- [ ] Tests: real temp migration preservation; stage failure leaves destination untouched; absent→unexpected present and modified destination abort; omitted index row fails; foreign cwd refuses before writes; repeated attempt cannot overwrite prior logs. Reuse existing helpers, no install in stage.
**Verification owner:** parent. Planned focused commands `rtk pnpm --filter ./cli exec vitest run src/services/__tests__/SyncService.spec.ts src/services/__tests__/SyncInstallLifecycle.spec.ts` plus `rtk proxy node --import tsx --test scripts/generation/*.test.ts`. Actual safe-stage consumer command supplied in report. **Handoff/freeze:** report `task-1-report.md`; mark FINAL. **Correction route:** current host ladder; no premium.

### Task 2: Complete dispatch and reconcile promotion (S02, S04, H01/H02 guidance)

**Files:** `skills/common/common-subagent-driven-development/**`, `skills/common/common-learning-log/**`, `skills/common/common-session-retrospective/**`, tests under `scripts/skill-tests/common-subagent-driven-development/` only. No other canonical workflow writes.
**Scope:** existing package scripts/templates/references/evals; no installed copies or AGENTS changes.
**Inputs:** task plan text and existing review package immutable writer. **Outputs:** a complete brief contract, unambiguous execution choice, proposed-only repeat learning, verified archive before cleanup.
- [ ] Reconcile Inline as explicit recorded exception, vague assent binds only presented choice, host/user retry/account rules override defaults. Preserve independent review and no recursive workers.
- [ ] Put scope/owned write set, I/O contract, real ingress, positive/negative invariants, verification owner, explicit handoff/freeze and correction route into brief template. Extend `task_brief.py` to reject missing required contract fields before output; keep public API or migrate every actual caller found. Refuse overwrite of explicit existing output. Existing historical plans lacking fields must receive a clear error rather than invented authority.
- [ ] Make repeat mistakes append/extend a proposed candidate, never automatic instruction/policy promotion. Reconcile linked learning format and evals. Cleanup requires verified durable archive and ownership authority; do not erase the only evidence copy.
- [ ] Include exact cross-worktree input paths and source/user/project-authored provenance + inclusive ranges for conversion handoffs; preserve unaffected fields. Explain denial alternative versus total block, sibling forward-only requests and error-not-terminal-state without pretending to enforce host behavior.
- [ ] Add behavioral helper tests (missing fields no output, complete brief extracted, fenced fake headings ignored, existing output preserved) and real-scorer eval cases for repeat mistake/Inline/vague proceed/archive failure/quality-vs-quota/no nesting. No prose snapshots.
**Verification owner:** parent; `rtk proxy python3 -B -m unittest discover -s scripts/skill-tests/common-subagent-driven-development` and real scorer calibration after Task5. **Report:** task-2-report.md FINAL. **Correction route:** host ladder.

### Task 3: Truthful layered acceptance (S01)

**Files:** `skills/common/common-tdd/**`, `.agents/workflows/implement-feature.md` only.
**Inputs:** existing Test Intent Record and settled-revision receipts. **Outputs:** concise acceptance contract/reference and eval controls; do not create a parallel RunRecord schema.
- [ ] Separate source-ready, focused checks, consumer-smoke, independent review and human acceptance with source/build identity, actual entrypoint/assertion and result artifact. Original preimplementation RED stays NOT RUN if absent; frozen old-revision proof separately labeled. Setup errors are not behavioral RED.
- [ ] Require actual test membership/count from output, no-listener/zero-exit completion rejection and actual producer→consumer proof. Later edits invalidate affected proof, not unrelated previous gates.
- [ ] Fix existing eval cases 4/5 negative substring assertions that reject their own compliant expected answers quoting unsafe terms. Replace with finite anchored decision controls, not bans on words in refusal text; include unsafe keyword-stuffed and partial-suite/no-marker answers as negatives.
- [ ] Add pressure cases for absent RED, partial suite, early exit and stale final source; do not fabricate runtime output or lower quality gate.
**Verification owner:** parent via real scorer test Task5 and scoped alignment. **Report:** task-3-report.md FINAL. **Correction route:** host ladder.

### Task 4: Trust boundary, browser and accounting guidance (S05)

**Files:** `skills/common/common-security-standards/**`, `skills/common/common-web-visual-testing/**`, `skills/common/common-telemetry/**`, `skills/common/common-context-optimization/references/implementation.md` only.
**Inputs:** approved S05/H05 unknown/accounting and native-browser requirements. **Outputs:** extensions to existing guidance and real-scorer finite case controls; no new skills or runtime collector.
- [ ] Security: operation-private minting, current independently protected authority, authenticated persisted evidence, transaction-time revalidation, alternate public APIs and second-process/connection races; reject stale ledger/sibling mint/direct API/cross-enrollment retention while preserving legitimate bootstrap/gap/resume/restore.
- [ ] Browser: native form/navigation Origin and actual populated states, CSRF/null rejection stays strict; fetch/manual-header/saved auth or renderer-only fixtures are not full login/backend governance proof.
- [ ] Telemetry: missing≠zero, partial lineage/rates stay unknown, shared parent/worker-only costs not full-task savings, listed≠body fetched≠delivered≠used. Keep no efficacy/cost claim without qualified evidence.
- [ ] Add finite scenario evals and supporting positive/negative controls grounded in expected outputs. Keep entrypoints concise and use existing references for details.
**Verification owner:** parent; Task5 can calibrate these JSONs after freeze. **Report:** task-4-report.md FINAL. **Correction route:** host ladder.

### Task 5: Evaluator and discovery/publication standards (S03, S06)

**Files:** `skills/common/common-skill-creator/**`, `skills/common/common-decision-discipline/**`, `.agents/workflows/session-report.md`, `.github/skills/skill-creator/SKILL.md`, new `scripts/evals/diagnostic-prevention.test.ts` only.
**Inputs:** actual `checkAssertion` engine semantics, existing eval schema, final JSON from Tasks2–4. **Outputs:** independent control matrix test and reconciled guidance.
- [ ] Freeze oracle before execution; use valid paraphrases, quoted unsafe text, unsafe keyword stuffing, partial compliance and unrelated routing negatives. Bind scorer/eval/final generated metadata; no engine-mismatch acceptance waiver. Reconcile existing 80/90% authoring inconsistency using existing release authority; don't change real acceptance thresholds merely for green results.
- [ ] Intake distinguishes failed search/current checkout absence from absent capability and searches authorized refs/worktrees. Publication requires final canonical→host ID-set/resource parity and real consumer discovery; separate warnings/skips/NOT RUN; review private paths/links and one-way manifests. Keep publication separate from activation.
- [ ] Add real-scorer tests over finite actual canonical cases from Tasks2–4. Author independent adjudicated controls; coordinate expected ID/interface through messages. Do not edit other owners' JSON. Test negative controls behavior, not source phrases or copied file equality. If oracle inconsistency occurs, report exact input/verdict to owner.
**Verification owner:** parent, `rtk proxy node --import tsx --test scripts/evals/diagnostic-prevention.test.ts scripts/evals/assertion-parity.test.ts scripts/evals/quality.test.ts`. **Report:** task-5-report.md FINAL; shared inputs read after other owners FINAL. **Correction route:** host ladder.

### Task 6: Truthful MCP telemetry and conditional price coverage (H05 reachable source)

**Files:** `mcp/src/services/SessionTracker.ts`, `TelemetryWriter.ts`, `WorkflowTelemetry.ts`, `mcp/src/tools/index.ts`, related `mcp/test/{Tools,TelemetryWriter,WorkflowTelemetry,SessionTracker}.spec.ts` only as needed.
**Inputs:** current source already distinguishes catalog discovery/body loads; don't redo historical fixed behavior. **Outputs:** explicit body/stub/estimate scope and truthful conditional cost completeness.
- [ ] Include direct skill body fetch estimates consistently; define body-return counters separate from dedup stub/selected IDs in persisted telemetry without breaking freshness readers. Migrate every repository consumer found for changed fields. Do not claim returned body was used by actor or authenticated host provenance from caller strings.
- [ ] Positive cached/reasoning usage requires corresponding rates before exact cost; missing rates remain partial/null, never implicit zero. Known zero buckets don't demand nonexistent rates. Preserve current numeric API with documented unknown if possible; no new accounting system.
- [ ] Tests: catalog list no bodies, direct fetch versus stub counts, absent body, cached/reasoning positive missing-rate partial, known zero, all-rates complete. Existing source tests may already pass; report baseline as existing, not a new fix.
- [ ] Document mounted MCP deployment identity unknown; no restart/reconfigure live service.
**Verification owner:** parent `rtk pnpm --filter ./mcp exec vitest run test/Tools.spec.ts test/TelemetryWriter.spec.ts test/WorkflowTelemetry.spec.ts`; actual SDK smoke on final build parent-owned. **Report:** task-6-report.md FINAL. **Correction route:** host ladder.

### Task 7: Bounded eval quota and readiness (H02/H04 reachable source)

**Files:** `scripts/evals/execute.ts`, `scripts/evals/evals-v2.test.ts` or focused new execute test, `scripts/skill-tests/product-evidence-integration/registry-fixture.mjs`, `consumer-smoke.mjs` and their existing tests.
**Inputs:** injected eval runner, existing child ownership/teardown, loopback fixture. **Outputs:** no fresh dispatch after observed quota within one run, preserved in-flight successes; retrievable readiness errors and immutable fresh output.
- [ ] On quota observation stop all lanes claiming new jobs; await already-owned in-flight promises, preserve their successes; no completedAt until all required answers. No cross-profile fallback or remote writer/cancel claim.
- [ ] Fixture readiness handles bind error/close-before-listen and bounded deadline; listeners attached before listen. Cleanup only own server/child, preserve teardown failures. Existing timeout without cancellation must not be reported completed.
- [ ] Consumer smoke refuses existing output before launching or deleting fixture state; use fresh attempts and exclusive final publication, retain failure result when possible without overwriting previous seal. Preserve real asserted completion, no exit0-only PASS.
- [ ] Tests use deferred synthetic runner and owned loopback/child fixtures, never real model calls or original journals. Ensure no orphan children/listeners in test errors.
**Verification owner:** parent `rtk proxy node --import tsx --test scripts/evals/evals-v2.test.ts` and `rtk proxy node --test scripts/skill-tests/product-evidence-integration/consumer-smoke.test.mjs`. **Report:** task-7-report.md FINAL. **Correction route:** host ladder.

### Task 8: Integrated proof, metadata and external gates (parent integration owner)

**Files:** metadata/changelog, ARCHITECTURE.md/CONTRIBUTING.md only relevant changes, generated configured mirrors, new implementation outcome under artifacts.
- [ ] Run all settled focused commands once, retain raw logs/result counts and no-run history; build CLI/MCP and exercise actual producer/install/MCP consumer path through protected fresh attempt output. Run validators/scorer/generation parity for touched packages and final-byte ID sets.
- [ ] Resolve every candidate S01–S06/H01–H05 against observed behavior or exact external prerequisite. H01 real actor-scoped approval and full host H02/H04 remain unimplemented externally; source changes are not rollout proof. Exporter source/accepted observability contract absent: do not manufacture request payloads or parallel collector.
- [ ] Preserve diagnostics baseline fingerprint, isolated original checkout and previous attempts. Independently review complete cumulative owned changes, give one corrective followup per slice then route per policy. Archive final evidence before any authorized scratch disposal; do not delete this attempt.
- [ ] Record pilot prerequisites/denominators and rollback pin; no activation, paid trials or human adoption claimed. Report all blockers honestly rather than declaring full host plan complete.
