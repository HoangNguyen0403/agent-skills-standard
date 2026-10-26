# Task 1 report: context-benefit delegation placement

- Plan: `docs/prd/prd-plan-context-aware-delegation.md` (SHA-256 `cd8752fa2c3e3c1c86740138fca5def367be679b23d57e5711fd01e8ca3855dc`)
- Task: 1 — Replace blanket delegation with a context-benefit decision
- Owner: Task 1 bounded implementer
- Source revision: `92d06c420f6a41f08e11579423e4e3eacdb7880d`; dirty identity at dispatch `3be6353d82626546f1f945544d394d4ff40e1be36d15ce668230e224d255a4b3`
- Required standards read: `common-subagent-driven-development`, `common-task-complexity-routing`, `common-decision-discipline`; skill-authoring/eval standards `writing-skills`, `agent-skills-eval-pressure-cases`; repo rules from `AGENTS.md`, `CONTRIBUTING.md` (§3/§4).
- Terminal state: **completed**. No commits, no delegation, no paid or live evals.

## Changed paths (owned only)

| Path | Change |
| --- | --- |
| `skills/common/common-subagent-driven-development/SKILL.md` | Rewrote §1 as placement decision; lifecycle table retained with `select placement` evidence; task loop gains an explicit placement step; anti-patterns gain stage/benefit rules. 99 lines. |
| `skills/common/common-subagent-driven-development/references/methodology.md` | Replaced the execution-confirmation gate with placement evidence rules, seven worked examples, confirmation rules; capability/effort paragraph links the canonical anchor; batching and review gates aligned. |
| `skills/common/common-subagent-driven-development/references/templates.md` | Implementer template gains a Placement block; reviewer template states review is placement-independent (main-loop implementation needs the same separate reviewer). |
| `skills/common/common-subagent-driven-development/references/progress-receipts.md` | Added placement and dispatch receipt requirements; capability/effort fields reference `routing-table.md#capability-and-effort-resolution` (Task 2 canonical) instead of restating policy; cost vocabulary kept distinct. |
| `skills/common/common-subagent-driven-development/evals/evals.json` | 14 behavior cases (8 retained/updated + 6 new AC cases), 5 pressure scenarios with semantic `behavior_assertions`, `rationalizations`, `red_flags`; authority/fallback regressions retained. |
| `.agents/workflows/implement-feature.md` | Entrypoint references the canonical placement decision, not a second table; BLOCKED wording widened to missing authority/context/standards/isolation; whole-branch independent review stated as mandatory. 71 lines. |

## AC evidence map

- **AC-01** (coupled sequential work + host permits main-loop → one implementation context): `skills/common/common-subagent-driven-development/SKILL.md:41` (table row "Coupled sequential reasoning; host permits main-loop implementation → One implementation context"); worked example rows 1 and 7 of `references/methodology.md`; eval id 9; pressure scenario "one agent per file" (asserts `keep the work in one context`, `file count`).
- **AC-02** (independent, verifiable, disjoint work → concurrent bounded workers): `SKILL.md:42`; `references/methodology.md` worked example 2 and §4 "Batching" ("Dispatch disjoint, dependency-ready slices concurrently with one owner each only when independent parallel work is the recorded benefit"); eval id 10.
- **AC-03** (specialist label or workflow stage does not require a new agent): `SKILL.md:35` ("A specialist label, another workflow stage, file count, plan length, or 'more thorough' fan-out is not a named benefit") and anti-pattern "No agent per stage" at `SKILL.md:94`; `references/methodology.md` worked example 5; eval id 11; pressure scenario "Two helpers are idle" (asserts `additional agent`, `idle capacity`).
- **AC-04** (host requiring delegation is followed even when one context would be preferable): `SKILL.md:37` precedence order starting with controlling host authority and `SKILL.md:43` ("Host requires worker execution → That boundary; keep coupled steps in one bounded worker"); `references/methodology.md` worked example 3 and Confirmation bullet 3; eval id 12; pressure scenario "host requires delegation" (asserts `stage agents`, `keep the whole coupled change`); `.agents/workflows/implement-feature.md:15`.
- **AC-05** (missing approval or unavailable isolation stops the affected operation, no inferred permission): `SKILL.md:44` ("Isolation or permission needed but unavailable → Report the operation unsupported or blocked; never infer permission") and `SKILL.md:49`; `references/methodology.md` worked example 6 and Evidence rules; eval id 13; pressure scenario "The host cannot isolate files" (asserts `stop the affected operation`, `enforceable isolation`); `implement-feature.md:34` BLOCKED wording.
- **AC-06** (independent acceptance gate cannot be satisfied by implementer self-review): `SKILL.md:46` ("One implementation context is not one actor… main-loop implementation still requires a separate reviewer"), lifecycle row "verify acceptance", task-loop step 4 ("Implementer self-review never satisfies this gate"); `references/templates.md` reviewer intro and prompt clause; `references/methodology.md` §4 step 5 and §6 ("including entirely main-loop execution"); eval ids 7 and 14; pressure scenario "already self-reviewed" (asserts `separate reviewer`, `acceptance gate`).

## Decision examples added

`references/methodology.md` §1 worked examples cover: coupled ordered call-site edits in a main loop → one context; four disjoint skill packages → four bounded workers; delegation-only host with one coupled migration → one bounded worker; security-sensitive change → separate reviewer regardless of placement; plan/implementation stages → one agent; unenforceable isolation → unsupported/blocked; long plan sharing one file → sequence in one context.

## Preserved contracts

- **C1:** the PRD decision table remains the single product contract; `SKILL.md` §1 is the canonical policy and both references and `implement-feature.md` cite it rather than restating a second table. Main-loop execution remains conditional on host permission. Independent verification survives either placement.
- **C2:** no model policy is defined here. Receipt fields and cost vocabulary point at `skills/common/common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution`; SNC sensitivity/review floors untouched; no resolver, pricing API, or assignment-schema field added; `sdd_progress.py` observation schema untouched.
- **C3:** receipts keep tokens, billed money, subscription/quota consumption and elapsed time distinct and count parent, workers, reviews, repairs and failed/cancelled attempts; no savings claim, no new telemetry store.
- **C4:** only owned paths edited; mid-flight builds/tests/lint/formatters skipped.

## Consumers outside owned paths requiring integration (not edited)

- Generated mirrors of the canonical skill and workflow: `.agents/skills/common/common-subagent-driven-development/SKILL.md`, `.claude/skills/...`, `.codex/skills/...`, `.github/skills/...`, `.claude/commands/implement-feature.md`, `.github/prompts/implement-feature.prompt.md`, `.codex/skills/implement-feature/SKILL.md`. They still contain the superseded "Inline is allowed only…" / "Subagent-Driven is the default" wording until Task 4 runs the generators.
- `skills/README.md:56` and `skills/common/_INDEX.md` embed the previous description text (generated summaries): regenerate with `pnpm generate-indices`.
- Eval manifest/benchmark inputs derived from `evals.json` ids may need regeneration under the eval tooling; ownership belongs to Task 4, not this worker.

## Corrective round (post-settle failures)

Failed before (reported by orchestrator, accepted as ground truth; not re-run here):

- Settled `pnpm validate` failed on a dead link in `skills/common/common-subagent-driven-development/SKILL.md`: the Task 2 anchor used `../../common-task-complexity-routing/...`, which escapes `skills/common/` when resolved from the skill root.
- `.agent/sdd/context-aware-delegation/scorer-smoke-result.json` showed all five SDD pressure cases accepting their explicitly unsafe candidate under both v1 and v2 (`unsafeV1Pass` and `unsafeV2Pass` true for cases 1-5). Cause: assertions repeated topic vocabulary the unsafe candidate reused verbatim (`named benefit`, `self-review`, `independent reviewer`, `unsupported or blocked`, `one bounded worker`, `workflow stage`).

Fixes:

- Link now `../common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution` at `SKILL.md:99`; references-relative links checked separately and remain `../../common-task-complexity-routing/...` because they resolve from `references/`. Skill still 99 lines.
- All five pressure cases rewritten with decision/action assertions that unsafe candidates omit: `keep the work in one context` + `file count`; `separate reviewer` + `acceptance gate`; `stop the affected operation` + `enforceable isolation`; `stage agents` + `keep the whole coupled change`; `additional agent` + `idle capacity`.
- Candidate fixtures and the expected v1/v2 matrix live in `.agent/sdd/context-aware-delegation/task-1-scorer-receipt.md` so the parent can exercise the real scorer after settle.
- Operation-contract preservation: `references/methodology.md` §3 keeps the existing seven host operations (`prepare`, `dispatch`, `completion`, `resume`, `cancel`, collect receipt, verify acceptance). The added `select placement` row was removed; placement is now preparation prose recorded before `prepare`, while the decision itself stays in `SKILL.md` §3 task loop and methodology §4 step 1. No new host lifecycle interface, no packet-schema change.

## Verification

Not run by this worker, per packet instruction ("worker reports not_run, never claims pass") and the corrective instruction to skip mid-flight tests/builds/formatters. No check result exists for the corrective round; the earlier read-only static shell check was denied by the user.

- `rtk proxy pnpm validate` — **not_run** (failed before on the now-fixed dead link; parent re-runs).
- `rtk proxy pnpm evals:audit` — **not_run** (parent runs at settled revision).
- Actual scorer over the pressure candidates in `task-1-scorer-receipt.md` — **not_run** (parent runs; expected matrix only).
- Other settled-revision commands (`pnpm test:evals`, `pnpm check-alignment`, `pnpm audit:skills`, `pnpm audit:sdlc`, `pnpm docs:capabilities:check`) — **not_run**.
- Manual checks completed: file/section consistency between `SKILL.md`, `methodology.md`, `templates.md`, `progress-receipts.md`, `evals.json`, `implement-feature.md`; link targets resolved by path (skill root uses `../`, references use `../../`); line budgets (SKILL.md 99 ≤ 100, workflow 71 < 80); each `evals[]` case has ≥2 assertions grounded in its prompt/expected output; pressure scenarios carry non-empty discriminating `behavior_assertions` per the receipt matrix.

## Limits and unresolved items

- No independent review or acceptance verdict is claimed here; that gate stays with the orchestrator.
- Rubric/offline eval evidence would not establish live model adherence; none claimed.
- No contradictions found between C1-C4 and the edited sources. Open integration item is regeneration of mirrors/exports and eval manifests by Task 4.
- Scorer discrimination is asserted by construction and inspection only; the parent's scorer run is the deciding evidence. Other skills' unsafe false positives are outside this owned scope.
