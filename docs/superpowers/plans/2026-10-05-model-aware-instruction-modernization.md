# Model-Aware Instruction Modernization

Status: approved for implementation by the user on 2026-10-05; Subagent-Driven selected.
Owner: repository maintainer (user); delivery/integration: orchestrator; implementation: bounded workers.
Profile: technical. SNC: S=2 N=2 C=2 total=6 high. Approval covers repository edits and local verification, not release, deployment, global host-policy changes, or paid benchmark sweeps.

## Goal and scope

Improve the instruction infrastructure identified in the preceding review: contradictory worker contracts, repetitive verification, fixed context assumptions, disproportionate workflow gates, specialist permission mismatch, and biased evaluation prompting. Deliver an executable task-evaluation pilot without claiming unmeasured model improvements.

The user request and preceding evidence-backed review are the approved direction contract. This document contains requirements, technical decisions, task ownership, and acceptance criteria; do not recreate intake in worker sessions.

Initial worktree state: untracked `paseo.json` belongs to the user and must remain untouched.

## Requirements and acceptance criteria

- REQ-1 / AC-1 — Core skills use applicability, project constraints, conditional procedures, and observable completion evidence. Remove mandatory per-tool rereads, fixed 10-turn/8k compaction, unsupported history mutation, and unsupported cost/context claims. Keep safety boundaries and useful progressive disclosure.
- REQ-2 / AC-2 — A single worker contract assigns owned files, tools/permissions, verification, Git ownership, escalation, and evidence. Workers do not commit, recursively delegate, or run full suites by default. Host policy remains authoritative. Independent review is risk-sized; routine tasks need not restart intake. Sensitive auth/money/trust-boundary changes have an explicit risk floor independent of arithmetic SNC totals.
- REQ-3 / AC-3 — Canonical writing specialists declare the existing L2 permission metadata; read-only specialists remain least-privilege. Codex exports allow workspace writes only for declared writing roles, never danger-full-access. Regression tests exercise canonical specialist content through the exporter, not copied strings alone.
- REQ-4 / AC-4 — New text-evaluation generation uses a new neutral protocol version: identical common instructions across baseline and with-skill arms except inclusion of skill content; no coaching pressure answers or requiring canonical/remediation phrases. Historical runs remain readable and verifiable, never relabeled or overwritten. Old protocol evidence cannot silently populate fresh neutral-protocol comparisons.
- REQ-5 / AC-5 — A runnable, opt-in executable-task harness compares minimal/current/candidate guidance with the same task, runtime capabilities, verifier, and starting files. It records exact model/effort labels, prompt/fixture hashes, repetition, exit/timeout outcomes, verifier results, timing, and raw evidence paths. Unknown usage/cost is null, never estimated as fact.
- REQ-6 / AC-6 — The executable harness uses isolated temporary fixture workspaces and trusted out-of-workspace verification. It neither executes repository production actions nor claims OS sandboxing. Workers cannot turn an incorrect implementation green merely by rewriting a fixture test. Repeated runs and calibration/holdout selection are explicit; no provider-specific quality ranking is hardcoded.
- REQ-7 / AC-7 — Canonical sources, generated mirrors, relevant docs, and changelog agree. Focused suites and actual exporter/harness smoke scenarios exercise changes. Verification infrastructure failures are reported separately from product failures. No historical benchmark percentages are regenerated as evidence of this change.
- REQ-8 / AC-8 — The integration records all delivered changes in `CHANGELOG.md`, updates only affected category versions in `skills/metadata.json` with an appropriate patch bump when required, and receives an independent, evidence-backed whole-change review before any pull request is opened. Review findings are resolved and affected checks rerun before committing/pushing/opening the PR.

## Decisions

1. Preserve the registry -> CLI -> native-agent architecture. Do not build a new orchestration service.
2. Reuse existing `risk_tier: L2` projection for writing specialists rather than inventing a second permission schema.
3. Keep read compatibility for immutable historical eval protocols; use `neutral-skill-v4` for newly generated text runs. Current-neutral evidence may not reuse coached v1/v3 answers. A historical/composite view must retain per-source protocol provenance and cannot be represented as a homogeneous comparison.
4. Keep textual assertions as explicitly labeled transcript evidence. Do not mass-rewrite the whole catalog or require exact wording solely to boost scores.
5. Add the executable pilot beside existing evaluation code, with independent artifacts and no change to historical text schemas beyond protocol support. Configured worker commands are trusted operator input, invoked as executable + argv without a shell. Model IDs and effort are supplied by the operator, not guessed.
6. Runtime/model policies belong to the host. No changes to user-owned skills outside this checkout, accounts, profiles, secrets, or global instructions.
7. Core authoring skills prefer readable compact language; size remains an editorial budget, not a behavioral quality claim. Existing validator compatibility must be maintained in this pilot; broad validator redesign is out of scope.
8. No commits, pushes, or PR publication by implementation workers. The orchestrator may commit and open a pull request only after integration verification and an independent clean pre-PR review, as explicitly requested by the user; deployment, publishing release tags, provider-profile mutation, and unbounded paid evaluations remain out of scope.

## Task 1 — Core policies and workflow sizing

Owner: policy worker. Independent of Tasks 2–4.

Owned files:
- `skills/common/common-skill-creator/` (SKILL.md and only directly affected references/evals)
- `skills/common/common-protocol-enforcement/`
- `skills/common/common-context-optimization/`
- `skills/common/common-task-complexity-routing/`
- `skills/common/common-subagent-driven-development/` (SKILL.md, methodology and templates; no scripts unless a contract change requires it)
- `skills/common/common-decision-discipline/` (only conflicting tier/intake statements)
- `.agents/workflows/sdlc.md`, `battle-test.md`, `skill-benchmark.md`, `implement-feature.md`, `evals-run.md`
- `.github/skills/skill-creator/` only if established as a manually maintained local authoring surface; otherwise report integration action, do not modify generated mirrors.

Steps:
1. Read the approved review findings and current target sources. Preserve narrow triggers, domain rules, and safety restrictions.
2. Replace unconditional rereads/verification loops with evidence freshness and risk conditions. Runtime-managed compaction only; no fixed model context figures or history rewriting instructions.
3. Align SDD templates: worker owns bounded implementation, focused verification, no Git/delegation; orchestrator integrates. Remove guaranteed savings and automatic file-count delegation advice. Host approval policy overrides defaults; do not silently remove this session's explicit execution gate.
4. Add a sensitive-change risk floor. Permit downward complexity reassessment only with documented new evidence, never to bypass unresolved risk or required approvals. Keep explicit authorization for irreversible actions.
5. Allow sufficiently specified low-risk maintenance to use an in-chat contract rather than mandatory BRD/PRD/SRS files. Preserve full traceability for governed/high-risk delivery. Do not reload parent intake in specialists.
6. Update authoring/battle-test guidance to distinguish structural checks, textual evidence, and executable outcomes; include rule retirement/ablation criteria. Remove answer-anchor padding in touched skills. Remove or revise obsolete wording-only eval cases, without replacing them with equally incidental wording tests.
7. Report exact changes, unresolved integration needs, and suitable focused checks; do not regenerate mirrors or run checks during parallel implementation.

Acceptance: AC-1, AC-2; final integration checks AC-7.
Verification after integration: `rtk pnpm audit:skills`, `rtk pnpm audit:sdlc`, targeted eval JSON/schema checks, and human review of contradictory instruction paths.

## Task 2 — Specialist permission declarations

Owner: specialist worker. Independent of Tasks 1, 3, 4.

Owned files:
- `skills/specialists/*/SKILL.md` solely permission metadata and clarifying execution boundaries for actual writing roles
- `cli/src/services/utils/__tests__/SpecialistTransformer.spec.ts`
- `cli/src/services/__tests__/SpecialistSyncService.spec.ts` if needed
- `cli/src/services/utils/SpecialistTransformer.ts` only if existing projection cannot satisfy AC-3; do not broaden default permissions

Steps:
1. Identify specialists that actually modify workspace files from their contracts, not their names. Declare `risk_tier: L2` for those; leave analysis/review personas read-only. No blanket elevation.
2. Read exporter and applicable frontmatter validation. Use LSP references before exported-symbol changes.
3. Add regression coverage that feeds real canonical writer and reviewer skill contents through Codex transformation and verifies usable workspace-write versus read-only, retaining no full-access escalation.
4. Do not hand-edit `.codex/agents`, `.claude/agents`, or other mirrors; integration owns regeneration.

Acceptance: AC-3.
Verification after integration: `rtk pnpm --filter ./cli test -- SpecialistTransformer SpecialistSyncService`; actual native export into a temporary destination, inspecting writer/reviewer permission results.

## Task 3 — Neutral text-evaluation protocol

Owner: eval protocol worker. Independent of Tasks 1, 2, 4. Owns existing text-eval pipeline only.

Owned files:
- Existing `scripts/evals/{execute,types,manifest,impact,compose,scorer,reporter,verify,constants,index}.ts` where necessary
- Existing `scripts/evals/*.test.ts` except new `task-*.test.ts` reserved for Task 4
- Related CLI/MCP consumers only when required by an existing imported protocol contract; announce extra paths before touching them

Steps:
1. Introduce `neutral-skill-v4` as the current generation protocol and centralize the current value rather than retaining competing literals. Preserve historical v1/v3 read/regrade compatibility.
2. Build identical task instructions across paired arms; only the skill payload differs. Remove answer-anchor coaching and pressure resistance coaching. Clearly describe text-only mode as transcript evidence.
3. Make execution and evidence reuse honor the manifest's protocol. Reject attempts to generate missing historical answers with the new prompt while leaving an old protocol label. Existing historic verification must still work unchanged.
4. Prevent old-protocol reuse from masquerading as fresh neutral evidence. Update affected composition/promotion behavior and metadata honestly, preserving immutable inputs and per-source provenance.
5. Add meaningful regression tests for resume/version mismatch, old/new reuse exclusion, historical readability, and actual prompt-conditioned arm behavior where injectable runner boundaries are already used. Do not re-pin irrelevant prose.
6. Report docs needed for Task 5. Do not regenerate committed historical reports or change model defaults merely for branding.

Acceptance: AC-4, transcript-label portion of AC-7.
Verification after integration: `rtk pnpm test:evals`, relevant CLI/MCP parity tests; `rtk pnpm evals:verify -- --all` against committed history.

## Task 4 — Executable task-evaluation pilot

Owner: executable eval worker. Independent of Tasks 1–3. No edits to existing text-eval files or package.json.

Create:
- `scripts/evals/task-types.ts`
- `scripts/evals/task-runner.ts`
- `scripts/evals/task-index.ts`
- `scripts/evals/task-runner.test.ts`
- `benchmarks/tasks/pilot.json`
- `benchmarks/tasks/fixtures/pagination/` and `benchmarks/tasks/fixtures/authorization/` with minimal dependency-free Node source inputs
- `benchmarks/tasks/verifiers/` with trusted dependency-free Node verifier programs
- Guidance files under `benchmarks/tasks/guidance/` for minimal/current/candidate pilot treatments, clearly fixture guidance rather than catalog evidence

Contract:
- CLI: `tsx scripts/evals/task-index.ts --manifest <json> --worker <json> --output <new-directory> [--repeat N] [--split calibration|holdout]`.
- Worker config: `{ executable: string, args: string[], model: string, effort: string, timeoutMs: number }`; `{workspace}` and `{promptFile}` are the only argv substitutions. Also pass the identical task prompt via stdin for CLIs supporting it. No shell interpolation. Missing/invalid config is an error; never guess a model or use a fake fallback.
- Manifest defines task ID, split, fixture directory, task prompt, three guidance file paths, trusted verifier executable/argv. Relative paths resolve from manifest directory. Validate path existence, unique IDs, finite positive bounded repetition/timeout, and output collision before running.
- Each task/repetition/arm gets a fresh temporary copy of the same fixture. Save prompts and worker stdout/stderr evidence outside the writable fixture. Treat fixture content as task data, not host instructions.
- Invoke the worker, then the fixed verifier against that workspace. Verifier source lives outside the workspace, and its integrity is checked before and after execution. Never trust worker-written tests or self-reported success.
- Spawn without shell; bound worker/verifier execution and clean up owned process groups on timeout. Record timeout, nonzero worker exit, verifier failure, and infrastructure error separately. Do not leak secrets or env dumps into reports. Document that local execution is not a sandbox; use only trusted worker commands and isolated nonproduction fixtures.
- Save results JSON containing schemaVersion, model/effort/config hash, task ID/split, arm, repetition, prompt/fixture/guidance/verifier hashes, exit outcomes, wall time, evidence paths, success, and usage/cost null when unavailable. Do not mix these results into text-eval headline percentages.
- Two honest tasks: pagination boundary behavior and cross-tenant authorization. Verifiers test consumer-visible behavior and adversarial boundaries, including denial for another tenant. Keep verifier tests out of the writable fixture.
- Unit/integration tests use a small real child-process fixture worker to create correct and incorrect implementations and exercise verifier rejection, isolated state, timeout, and collision/error handling. Such fixture workers are tests, not reported model benchmarks. The user-facing runner always executes the configured real worker.

Acceptance: AC-5, AC-6. Deliver a functioning command, not a scaffold or mock production path.
Verification after integration: focused task-runner tests; invoke actual CLI on temporary fixtures with a deterministic child process to demonstrate pass, incorrect authorization rejection, and timeout reporting. Live model sweeps require separately available runtime configuration and are not claimed by this smoke.

## Task 5 — Integration, versioning, documentation, verification, pre-PR review

Owner: fresh integration worker after Tasks 1–4 are reviewed. Sole owner of shared/generated files. The orchestrator owns independent final review and PR creation after the review clears.

Owned files:
- `package.json` only adding `evals:tasks` command and required test wiring
- `ARCHITECTURE.md`, `CONTRIBUTING.md`, `docs/EVALS.md`, `CHANGELOG.md`
- `skills/metadata.json` category versions and dates for changed skill/workflow packages
- Root project instruction bridge/generator sources only to remove contradictory project-owned bootstrap requirements identified by Task 1; do not edit unrelated host instructions
- Generated indices, native workflow/agent/skill mirrors via existing generator
- This plan's completion/evidence section

Steps:
1. Integrate reviewed slices without overwriting other changes. Preserve `paseo.json`.
2. Document protocol versioning, historical evidence limits, executable CLI/worker contract, model-config ownership, permissions, and risk-sized workflows. Label pilot fixtures and smoke results accurately; no fabricated savings.
3. Add a concise change entry to the existing `Unreleased` section of `CHANGELOG.md`, preserving existing entries. Inspect the exact changed canonical categories and bump each affected category's patch version in `skills/metadata.json` only when required by project versioning rules; currently common `2.8.3`, specialists `1.5.0`, workflows `1.1.1` are candidates. Do not bump unrelated categories, publish tags, or change CLI/package versions without a documented compatibility reason. Keep changelog version notes aligned with actual metadata changes.
4. Generate native outputs once using `rtk pnpm generate-indices`; preserve customization ownership semantics. Resolve the local authoring-standard duplication without editing files outside this repository.
5. Run appropriate focused suites, validators, historic eval verification, and exporter/task-runner smoke. Fix defects from evidence; no blind re-running unchanged failures.
6. Hand the completed, verified implementation to an independent reviewer for AC-1 through AC-8, trust boundaries, child-process safety, immutable histories, all consumers, changelog/version consistency, and generated drift. Address findings and rerun affected verification. Only after a clean pre-PR review may the orchestrator commit, push, and raise a pull request, if Git remote/auth are available; report any access blocker rather than claiming a PR exists.

## Verification ownership and gates

Workers skip build/lint/test/format commands while independent slices are in flight; author regression tests and report commands. This session's runtime rule overrides skill templates that demand mid-flight checks. Integration runs the coordinated verification once all relevant edits settle, with focused reruns only for actual corrections. No claim of failing-before proof when that sequence was not exercised.

Proposed commands (confirm actual package scripts before invocation):
- `rtk pnpm --filter ./cli test -- SpecialistTransformer SpecialistSyncService`
- `rtk pnpm test:evals`
- `rtk pnpm evals:verify -- --all`
- `rtk pnpm audit:skills`
- `rtk pnpm audit:sdlc`
- `rtk pnpm generate-indices`
- Focused CLI/MCP contract tests affected by protocol/export changes
- Actual temporary native export and executable-task CLI smoke

## Evidence and completion

Executed verification during Task 5 integration:
- `rtk pnpm generate-indices`: PASSED. Emitted indices for 25 categories, updated `AGENTS.md`, and synced 33 workflows, 87 skills, and 21 specialists across `.github`, `.agents`, `.codex`, and `.claude`. Resolved wrapper drift.
- `rtk pnpm --filter ./cli test -- SpecialistTransformer SpecialistSyncService`: PASSED (64 test files, 1256/1256 tests passing). Proves writer specialists export as `workspace-write` and reviewers as `read-only` without `danger-full-access`.
- `rtk node --import tsx --test scripts/evals/evals-v2.test.ts`: PASSED (45/45 tests passing). Verifies `neutral-skill-v4` protocol, identical instructions across arms without coaching, historical v1/v3 immutability and provenance tracking, and composite report boundaries.
- `rtk node --import tsx --test scripts/evals/system-design-behavior.test.ts scripts/evals/usage-cost.test.ts scripts/evals/quality.test.ts scripts/evals/assertion-parity.test.ts`: PASSED (26/26 tests passing).
- `rtk pnpm audit:skills`: PASSED. Zero redundant checkpoints found across skills catalog.
- `rtk pnpm audit:sdlc`: PASSED. All 33 workflow surfaces, routing tables, and specialist budgets/outputs validated.
- `rtk pnpm evals:verify -- --all`: PASSED. All 3 historical runs (`all-v2.6.0`, `all-v2.6.1-...`, `governed-cybersecurity-...`) verified against immutable snapshots.
- Native exporter permission inspection: VERIFIED. `.codex/agents/tdd-implementer.toml` projects `sandbox_mode = "workspace-write"`; `.codex/agents/pr-reviewer.toml` projects `sandbox_mode = "read-only"`.
- `rtk pnpm build`: PASSED (CLI Vite build succeeded in 30ms).
- `rtk pnpm validate:all`: PASSED (324/324 skills validated, 0 failed; `audit:skills` clean; `audit:injection` clean; `freshness:audit` completed).
- `rtk pnpm check-alignment`: PASSED (100% of skills meet alignment threshold).
- `rtk pnpm --filter ./cli lint`: PASSED (0 errors across CLI TypeScript sources).
- `rtk pnpm --filter ./mcp test`: PASSED (10 test files, 127/127 tests passed).
- Executable task-runner tests (`task-runner.test.ts`): PASSED (21/21 tests passing in 7.04s). Validates process isolation, SIGTERM-resistant descendant cleanup (1795ms), detached-pipe timeout settlement (1756ms), fixture snapshotting (2/2), prompt evidence tampering as infrastructure error, independent timeout accounting with verifier tampering (1981ms), and verifier infrastructure failure exclusion.
- Full eval test suite (`test:evals`): PASSED (92/92 tests passing across all eval suites).
- Built-in CLI smoke (`rtk pnpm evals:tasks`): PASSED. Exercised on temporary fixtures with deterministic workers:
  - Compliant pagination + authorization: 6/6 runs passed (100%), exit code 0, results JSON verified (`usage: null`, `cost: null`).
  - Insecure authorization: 3/3 runs rejected by trusted verifier (0% pass, 3 product failures, 0 infra errors), exit code 1.
  - Process timeout: 3/3 runs timed out (`timedOut: 3`, 3 product failures, 0 infra errors), exit code 1.
  - Excluded infrastructure error denominator and null-no-evidence semantics verified. These deterministic child-process runs verify runner plumbing and verifiers; they do not represent live model capability benchmarks.
- Full root test suite (`rtk pnpm test`): PASSED (Exit 0, 12.53s). Independently executed by orchestrator (`artifact://22`): CLI 1256/1256 + evals 92/92 + freshness 62/62 + outcome 23/23 + trace 16/16 + benchmark 8/8 + metrics 44/44 + release 8/8 + harness 24/24. Final retained smoke results directly inspected: compliant 6/6, reject 0/3 verifier exit 1, timeout 3/3 all true infra 0.
- CLI invocation interface smoke: PASSED (Exit 0). Observed that `pnpm evals:tasks -- --help` fails exit 1 because pnpm forwards literal `--`, causing Node `parseArgs` to treat `--help` as positional with `allowPositionals: false`. Supported command `rtk pnpm evals:tasks --help` exits 0 cleanly in 0.50s. Updated 4 documentation examples across `docs/EVALS.md` and `CONTRIBUTING.md` to remove standalone `--`.
