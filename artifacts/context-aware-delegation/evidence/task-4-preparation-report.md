# Task 4 preparation report: canonical documentation and evaluation protocol

- Task: `context-aware-delegation-4-preparation` (Task 4, preparation subset only)
- Owner: Task 4 integration preparation owner (single writer)
- Project domain: agent-skills-standard / Personal
- Source revision: `92d06c420f6a41f08e11579423e4e3eacdb7880d`; dirty identity at dispatch `3be6353d82626546f1f945544d394d4ff40e1be36d15ce668230e224d255a4b3`
- Required standards read: `common-subagent-driven-development` (skill) and managed `agent-skills-standard-integration-gates`, `ags-generator-safety`, `sdd-evidence-preservation`, `ags-evidence-status-wording`; plan/PRD at their recorded digests.
- Terminal state: **completed** (preparation). This is **not** Task 4 completion, integration acceptance or activation.

## Changed paths (owned only)

| Path | Change |
| --- | --- |
| `ARCHITECTURE.md` | Added §3.4 "Context-Aware Delegation and Capability Guidance" stating C1 placement, C2 capability/effort + receipt reuse, C3 evidence/economics and the protocol pointer; replaced the unmeasured "90% scouting-token reduction" claim with a design-estimate qualifier and no measured-saving claim. |
| `CONTRIBUTING.md` | Added §10 "Delegation, capability and evaluation evidence": one placement contract, one capability contract, hints are not authority, honest accounting, offline vs live, no unauthorized spend, protocol conformance, generated-surface/evidence rules. |
| `CHANGELOG.md` | Added three `[Unreleased] → Added` entries (placement candidate, capability candidate, protocol) and three `Changed` entries (model-trigger precision with observed smoke results, documentation/claims, repository-local integration checkpoint). |
| `docs/validation/context-aware-delegation-protocol.md` | New: ten scenarios, three matched repetitions per scenario per arm, Phase A/B/C unchanged-variable controls, metrics/accounting coverage, acceptance/rejection rules, authorization prerequisites, reporting template, current status. |

No other path was edited. No generator ran, no generated output or mirror was touched, no source1/2/3 file was edited.

## AC evidence map

- **AC-20** (offline evidence not described as live efficacy or savings): protocol §1; `ARCHITECTURE.md` §3.4 C3 and §4 item 3 qualifier; `CHANGELOG.md` checkpoint bullet ("lexical/deterministic results, not live model efficacy or savings"); `CONTRIBUTING.md` §10 item 5.
- **AC-21** (ten scenarios, three matched repetitions per arm, per-case regressions, unchanged-variable controls): protocol §3 scenario table, §4 phases/controls, §6 acceptance rules; mirrored in `CONTRIBUTING.md` §10 item 7.
- **AC-22** (no paid execution without authorization): protocol §2 prerequisite table and §8 `not_run` status; `CONTRIBUTING.md` §10 item 6; `ARCHITECTURE.md` §3.4.
- **PREP-01** (canonical docs describe C1-C3; source review and copy-back explicitly pending): `ARCHITECTURE.md` §3.4 status line and bullets; `CHANGELOG.md` "source candidate pending independent review" / "generated mirrors are not yet regenerated"; protocol §8 pending rows.

## Evidence used (observed, not produced here)

- Routing smoke: nine canonical `SkillIndex` queries — `model routing`, `LLM model selection`, `thinking level`, `model tier`, `MongoDB model design`, `Mongoose model`, `Laravel model relationships`, `Eloquent model scopes`, mixed `LLM model selection for MongoDB model design`; before/after IDs in `.agent/sdd/context-aware-delegation/routing-smoke-result.json`.
- MCP suite 241 tests across 13 files; SDD Python suites 42 tests; `pnpm test:evals` passed (`.agent/sdd/context-aware-delegation/checks-result.json`, `verification-checkpoint.md`).
- Corrected pressure-scorer smoke: 65 candidates, 39 unsafe rejected under both assertion semantics, 26 safe accepted under v2, zero failures (`.agent/sdd/context-aware-delegation/corrected-scorer-smoke-result.json`). Lexical discrimination only.
- `pnpm validate` exit 0 after the dead capability-link correction; `pnpm evals:audit` exit 0 with two pre-existing out-of-scope `database-hana` single-assertion reports; `pnpm check-alignment --threshold 70` pass with `flutter`/`swift` warnings (orchestrator-reported checkpoint; earlier `validate` exit 1 and the all-unsafe-accepted scorer run are preserved as history in `verification-checkpoint.md`).

## Checks

| Check | Result |
| --- | --- |
| `rtk proxy pnpm validate` | `not_run` here — parent runs at settled revision (prior run passed per checkpoint) |
| `pnpm evals:audit`, `audit:keywords`, `audit:skills`, `audit:sdlc`, `check-alignment`, `docs:capabilities:check`, MCP/Python suites | `not_run` here — parent |
| Generators (`pnpm generate-indices`, `pnpm docs:capabilities`) | `not_run` — blocked on independent source acceptance |
| Static local check: referenced canonical paths/anchors exist (`SDD SKILL.md`, `routing-table.md#capability-and-effort-resolution`, PRD/plan, both database skills) | pass |
| Any live/paid eval, provider/profile change, commit | `not_run` — not authorized |

## Lifecycle interface consistency

- The seven semantic lifecycle operations in `ARCHITECTURE.md` §3.3 (prepare, dispatch, completion, resume, cancel, collect receipt, verify acceptance) are unchanged; §3.4 explicitly states placement is a preparation decision recorded on the existing dispatch receipt, not an eighth operation or a new host API/schema field. `CONTRIBUTING.md` §10 item 1 carries the same rule.
- No task_brief schema, `sdd_progress.py` observation field or lifecycle interface wording was edited. Task 1 owner's move of `select-placement` from a methodology table row into preparation prose is source-side and remains under that owner's review gate.

## Protected evidence and invariants

- `.agent/sdd/context-aware-delegation/**` left untouched (no generator ran, so no `.agent` migration risk was exercised).
- No generated mirror, index, `skills/index.json`, `.agents/**` or `docs/agent-capabilities.md` edit; those remain stale relative to canonical sources and are explicitly marked pending.
- No source1/2/3 path edit; C4 ownership respected. No recursive delegation, no provider/model change, no commits.

## Pending (explicit)

1. Independent review of Tasks 1-3 source and their receipts — remains the gate; this documentation does not accept them.
2. Generated copy-back (`.agents/skills/**`, category indices, `skills/index.json`, native workflow exports) under the generator-safety allowlist procedure, after source acceptance.
3. Live Phase A/B/C comparison — `not_run`; requires separately recorded eligibility, exact model/effort, run cap, spend ceiling, expiry and human approval.
4. Task 5 independent final acceptance of the integrated revision (AC-01..22).

## Risks / limitations

- Docs describe candidate canonical behavior; if source review rejects or changes a candidate, `ARCHITECTURE.md` §3.4, `CONTRIBUTING.md` §10 and the changelog entries must be refreshed.
- Changelog entries intentionally avoid activation, enforcement and savings claims; they are repository-local and offline only.
- No verification of the rendered documentation surface beyond path/anchor existence was performed in this preparation slice.
