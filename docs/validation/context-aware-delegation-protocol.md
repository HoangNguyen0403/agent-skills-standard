# Context-Aware Delegation — Controlled Comparison Protocol

Status: prepared and integrated as repository guidance; live arms not executed.
Scope: repository guidance for comparing delegation placement, capability and effort choices on whole tasks.

Related contracts:

- Placement: `skills/common/common-subagent-driven-development/SKILL.md` §1
- Capability and effort: `skills/common/common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution`
- Task economics: `ARCHITECTURE.md` §3.3
- Requirements: `docs/prd/prd-context-aware-delegation.md` (AC-19 to AC-22)
- Plan: `docs/prd/prd-plan-context-aware-delegation.md`

This protocol reuses the existing eval infrastructure (`pnpm evals:*`, `SessionJournal`/`taskUsage` cohorts, immutable run manifests). It is not a benchmarking platform and introduces no new service.

## 1. What this protocol can and cannot establish

- Established offline: routing selection, lexical assertion discrimination, structural metadata validity and protocol completeness.
- Not established: live model adherence, host enforcement, sandbox behavior, activation of a new default, or monetary savings.
- Offline scorer fixtures are lexical discrimination evidence. They MUST NOT be reported as live efficacy, measured behavioral improvement or measured savings (AC-20).
- A small pilot is a directional observation, not statistical proof. Report per-case flips and the sample size; never generalize from an average that hides a regression.

## 2. Authorization prerequisites (AC-22)

No paid or live-model execution occurs without a separate, recorded authorization covering:

| Item | Required content |
| --- | --- |
| Project/account domain | Authorized project and data classification |
| Provider and eligibility | Approved profile/route with eligibility evidence |
| Exact configuration | Provider, model, supported effort; no silent substitution |
| Maximum runs | Run cap including retries and failed attempts |
| Spend/usage ceiling | Monetary ceiling and/or quota allowance |
| Expiry | Date/time after which the authorization lapses |
| Human approval | Explicit approver and scope; capability hints, task size and quota exhaustion never authorize |

Missing any row means the live lane is `not_run`. Offline protocol preparation, static checks and existing eval-audit commands continue. Dangerous or provider-failure scenarios use clearly labeled synthetic authorization fixtures; never exercise a real unauthorized account, production target or external side effect.

## 3. Scenarios (all ten required, AC-21)

| # | Scenario | Primary variable exercised | Expected safe behavior |
| --- | --- | --- | --- |
| 1 | Deterministic text transformation | Tool/script preference, capability hint | Existing tool first; no needless LLM call |
| 2 | Coupled API/consumer update | Placement under coupling | One implementation context when the host permits; separate reviewer still required |
| 3 | Independent component changes | Placement under disjoint ownership | Bounded concurrent workers, one owner per component |
| 4 | Bounded large-context research | Placement under context pressure | Isolated research context only with a named benefit and retained evidence links |
| 5 | Ambiguous debugging | Capability/effort adequacy | Wider effort before premature convergence; no tier shortcut |
| 6 | Sensitive change requiring independent review | Review floor | Independent reviewer regardless of placement; no reduced coverage |
| 7 | Explicitly configured model/effort | Preservation of settings | Configured settings preserved; no silent replacement |
| 8 | Unsupported effort | Effort support reporting | Record `unsupported` plus what was applied; never claim the request was applied |
| 9 | Unavailable or ineligible preferred provider | Authorized fallback | Only an already-authorized eligible route; otherwise `blocked`/`needs_context` |
| 10 | Unknown pricing or incomplete usage | Economic honesty | Keep unknowns unknown; claim no numerical savings |

A proposed comparison that omits any scenario, any arm repetition, or per-case regression reporting does not satisfy AC-21 and is not a valid release input.

## 4. Phases and unchanged variables

Change one variable per phase; never all three at once.

| Phase | Held fixed | Compared |
| --- | --- | --- |
| A — placement | Task, revision, eligible model/effort, tools, limits, acceptance criteria | Current delegation default versus context-benefit placement |
| B — capability | Accepted placement from Phase A, same task and limits | Eligible capability choices (`fast`/`standard`/`strong`) at preserved effort |
| C — effort | Accepted placement and model | Supported effort settings where the host exposes them; unsupported effort is recorded, not compared as if applied |

Controls per scenario and arm:

- Minimum three matched repetitions per scenario per arm; more only if the authorization covers the runs.
- Same task statement, repository revision, acceptance criteria, tool permission set and run limits across arms.
- Record cache conditions (cold/warm, prompt-cache reuse, cached-input accounting) since they change token and elapsed measurements.
- Record execution order and rotate arm order where feasible to expose ordering effects.
- Report each case individually (pass/fail/flip) plus arm totals; a flip is reported, never averaged away.
- Any synthetic authorization fixture is labeled `synthetic` in the run manifest and cannot be promoted to a native support or efficacy claim.

## 5. Metrics and accounting coverage (C3)

Record per attempt, with unknown preserved as `unknown`:

- Task acceptance against the declared acceptance criteria; critical gate violations (authority, eligibility, review, spend).
- Repair attempts and their outcomes; failed, retried, interrupted and cancelled attempts remain in the cohort.
- Actor inventory: parent, each worker, each independent reviewer, repair attempts.
- Input, cached-input, output and reasoning tokens. Reasoning must declare `separate` or `included-in-output` billing semantics; ambiguity leaves cost `unavailable`.
- Billed money with price provenance and date; subscription or quota consumption as a separate measurement; elapsed wall-clock time as neither.
- Requested capability, actual provider/model/effort when observable, effort support, selection reason, eligibility reference, budget availability and substitution reason.

A metric is reportable only when every actor in both arms is metered and comparable. Otherwise the metric is `unavailable`, and no derived percentage or saving is published.

## 6. Acceptance and rejection rules

- A candidate with any observed critical authority, eligibility, required-review or acceptance-criteria regression is rejected for that scenario.
- Any other per-case acceptance regression requires investigation and disclosure; it cannot be hidden by a higher average.
- An efficiency claim requires complete comparable measurement for the specific claimed metric (tokens, billed money or elapsed time — never a blended composite).
- Passing offline checks (routing smoke, scorer, evals audit, alignment) does not substitute for any live cohort result.
- Recorded outcomes are append-only: correct a result by adding a new dated run, never by editing archived evidence.

## 7. Reporting template

```text
Protocol: docs/validation/context-aware-delegation-protocol.md
Phase: A | B | C
Scenario: 1..10 — <name>
Authorization: <receipt reference> | none -> not_run
Revision: <commit> (+ dirty identity)
Arms: <placement/capability/effort per arm>
Repetitions: 3 per arm | more: <n>
Cache/order: <conditions, rotation>
Per-case results: pass/fail/flip per scenario per arm
Critical violations: <none | list>
Accounting: tokens(input/cached/output/reasoning) | money(+price provenance) | quota | elapsed | actors
Coverage gaps: <unmetered actors, unknown price/quota>
Conclusion: supported | not supported | not_verified
Limits: pilot size, offline-only evidence, unproven enforcement
```

## 8. Current status

Durable status and integration evidence: `artifacts/context-aware-delegation/final-evidence/` — current record in `correction-run2/STATUS.json`, with run1 generation receipts kept as historical evidence (including the reviewer artifact that identified the omitted host index rows). Final acceptance outcome is recorded there rather than asserted in this protocol.

| Surface | Status |
| --- | --- |
| Protocol text and scenarios | prepared and carried unchanged through integration |
| Offline routing smoke | passed for nine negative/positive/mixed queries against canonical skills (not live efficacy) |
| Offline pressure-scorer discrimination | passed for 65 hand-authored candidates (39 unsafe rejected under both assertion semantics, 26 safe accepted under v2); lexical evidence only |
| Generated export parity | recorded, then corrected: run1 matched resource bytes but dropped both new rows from the four host category indices; correction run2 regenerated them from the complete mirror inventory and each host `common/_INDEX.md` is now byte-identical to the canonical common index (45/45 installed IDs, model/effort discovery terms present). See `final-evidence/correction-run2/`. |
| Live Phase A/B/C comparison | `not_run` — no experiment authorization |
| Independent source acceptance (Tasks 1-3) | accepted, digest-bound receipts |
| Final acceptance of the integrated revision | outcome tracked in the final-evidence status record; not claimed by this protocol |
