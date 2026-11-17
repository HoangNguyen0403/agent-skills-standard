# Product Requirements Document (PRD): Role-Based Model Routing — Slice 1, Dispatch Observations

**Status**: Approved (requesting maintainer, 2026-11-17) | **Owner**: Requesting maintainer | **Delivery mode**: extended | **Last Updated**: 2026-11-17

> Source brief: `docs/brd/brd-role-based-model-routing.md`, approved 2026-11-16 at commit `14ccf8faf` for planning slice 1 only. This PRD covers slice 1 alone. Slices 2–5 keep their brief rows and are not planned here.

slug: role-based-model-routing
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong

## 1. Decision Brief

- **Changes since approved revision:** Initial draft. It turns the brief's "Slice 1 Observation Contract" into requirements and acceptance criteria.
- **Recommendation:** Build slice 1 as three feature slices plus one documentation prerequisite (section 8). Route the three open technical contracts (section 5) to `design-solution` before any code.
- **Impact if wrong:** Observations are recorded in a shape later slices cannot use. The cost is rework of one event format and one report section, because no consumer exists yet.
- **Evidence and limitations:** The existing delivery event schema identifies changes and revisions, not dispatches, roles or models (confirmed: `scripts/metrics/types.ts:96-176`). The `cost` event already carries an `agent` component (confirmed: `scripts/metrics/delivery.ts` `validateEvent`). The supervision figures in the brief come from a maintainer-local script and are observational. No observation file exists in this checkout.
- **Unresolved decisions:** Storage shape, the telemetry adapter and the producer path (section 5). Owner: maintainer. Affected slices: FS-1, FS-2.
- **Approval:** Granted 2026-11-17 for this PRD's requirements, acceptance criteria and slice plan, and for routing D1–D3 to `design-solution`. It grants no implementation, host configuration change, eval spend or release.
- **Independently ready slices:** P-1 (protocol restoration) needs none of the open decisions.

## 2. Outcome And Guardrails

- **Business objective ref:** Brief contract, acceptance criterion 2: a per-dispatch observation contract with declared coverage.
- **Problem and outcome:** Today nothing records how many rounds a delegated worker needed, or whether its output was accepted. So routing between models rests on price and judgment. After slice 1, a maintainer can run one command over a window and see, for each role and model, dispatches, rounds, review verdicts, authorized acceptance, and the supervision and worker cost attached to them. Every gap is marked unavailable.
- **Primary metric:** Share of dispatches in a window that have a recorded acceptance outcome. Target `unknown`, measure first.
- **Guardrails:**
  - Existing delivery indicators and their tests do not change behavior.
  - Unknown values never become zero, and a reviewer verdict never becomes acceptance.
  - Canonical skills and workflows name no model, provider, account or profile.
  - Report outputs contain no prompts, titles or local filesystem paths.

## 3. Scope And Non-Goals

- **Scope fence:** Slice 1 of the approved brief: observation recording, the report over those observations, an import of host telemetry joined to dispatches, and the deleted protocol document.
- **In scope:**
  - Record a dispatch.
  - Record rounds, verdicts and acceptance against a dispatch.
  - Report per role and model.
  - Join host telemetry to dispatches.
  - Guide orchestrators to record observations.
  - Restore the protocol citation targets.
- **Non-goals:**
  - Model cards and the admission protocol (slice 3).
  - Role vocabulary and the routing rule (slice 2).
  - Any host configuration change (slices 4–5).
  - Any routing decision based on these observations.
  - Any savings claim.
  - A new telemetry service.

## 4. Requirements And Acceptance Criteria

| Req ID | Requirement | Owner | Priority | Status | Brief ref |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | A dispatch observation records one delegated worker: dispatch identifier, the `change_id` it serves, role, requested capability hint, actual configuration (provider, model, effort, or `unknown` for each), eligibility or authority reference, orchestrator model, and terminal state. | Maintainer | P0 | Draft | AC2, Join |
| REQ-002 | Submission, correction, review and acceptance observations can name a dispatch identifier. Per-dispatch metrics use only observations that do. | Maintainer | P0 | Draft | Join |
| REQ-003 | A round is one worker submission against one brief. A correction starts the next round of the same dispatch; a new brief is a new dispatch. | Maintainer | P0 | Draft | Round |
| REQ-004 | A reviewer verdict is recorded on the dispatch and is never counted as acceptance. Acceptance keeps its existing meaning: an acceptance observation with an authority reference. | Maintainer | P0 | Draft | Review verdict versus acceptance |
| REQ-005 | Accepting a change does not mark every contributing dispatch accepted. Without a named dispatch, the dispatch's acceptance is `unknown`. | Maintainer | P0 | Draft | Change-level acceptance |
| REQ-006 | Cancelled, failed and errored dispatches stay in the cohort with their terminal state and are never counted as accepted. | Maintainer | P0 | Draft | Cancelled and failed |
| REQ-007 | The metrics report shows, per role and per actual model: dispatches, rounds per dispatch, first-round acceptance share, acceptance-unknown count, terminal-state counts and declared coverage. A value that cannot be computed is reported unavailable with its reason. | Maintainer | P0 | Draft | Slice 1 output |
| REQ-008 | A window-bounded import reads local host telemetry and attaches, per dispatch, orchestrator supervision (turns, tokens, list cost) and worker usage (turns, tokens, list cost), with the allocation method stated. Hosts without an adapter report these fields unavailable. | Maintainer | P1 | Draft | Slice 1 output |
| REQ-009 | Orchestrator guidance in `common-subagent-driven-development` tells the orchestrator when to record each observation. It links the canonical contract instead of restating it. | Maintainer | P1 | Draft | Slice 1 |
| REQ-010 | `docs/validation/context-aware-delegation-protocol.md` exists again, so the citations in `ARCHITECTURE.md` and `CONTRIBUTING.md` resolve. Its status section reflects current evidence only. | Maintainer | P1 | Draft | Slice 1 |
| REQ-011 | Imported and reported data contain aggregates and identifiers only: no prompt text, titles or local filesystem paths. | Maintainer | P0 | Draft | Brief privacy |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | an observation file with a dispatch observation that omits role or dispatch identifier | the metrics reader validates the file | the file is rejected with a problem naming the missing field, and no metric is computed from it | Maintainer | unit |
| AC-002 | REQ-001 | a dispatch observation whose actual model is `unknown` | the report runs | the dispatch is counted under an `unknown` model row, not dropped and not assigned to the requested capability | Maintainer | unit |
| AC-003 | REQ-002 | a submission and a review for the same change, one naming a dispatch and one not | the report runs | only the named observation contributes to per-dispatch metrics, and coverage for that change is reported incomplete | Maintainer | unit |
| AC-004 | REQ-003 | a dispatch with one submission, one correction and a second submission | the report runs | the dispatch shows 2 rounds | Maintainer | unit |
| AC-005 | REQ-004 | a dispatch with an approving review verdict and no acceptance observation | the report runs | the dispatch's acceptance is `unknown`, and the first-round acceptance share does not count it as accepted | Maintainer | unit |
| AC-006 | REQ-004 | an acceptance observation without an authority reference | the reader validates the file | the observation is rejected | Maintainer | unit |
| AC-007 | REQ-005 | two dispatches on one change, and an acceptance that names only the change | the report runs | both dispatches report acceptance `unknown` | Maintainer | unit |
| AC-008 | REQ-006 | a cancelled dispatch and an errored dispatch | the report runs | both appear in the cohort with their terminal state and neither counts as accepted | Maintainer | unit |
| AC-009 | REQ-007 | no observation file | the metrics report runs | every dispatch row reports unavailable with a reason, and the command exits as it does today | Maintainer | integration (`pnpm metrics:report` on an empty fixture root) |
| AC-010 | REQ-007 | a fixture with dispatches for two roles and two models | the metrics report runs | the report lists one row per role and model with dispatches, rounds per dispatch, first-round acceptance share, acceptance-unknown count, terminal states and coverage, matching hand-computed values | Maintainer | integration (fixture root) |
| AC-011 | REQ-008 | a telemetry fixture with an orchestrator transcript and worker sessions, and a window | the import runs | each dispatch created in the window carries supervision and worker usage counted only inside the window, and the output states the allocation method | Maintainer | integration (fixture telemetry) |
| AC-012 | REQ-008 | a host with no telemetry adapter | the import runs | supervision and worker usage report unavailable with the reason, and the observation-only report still runs | Maintainer | unit |
| AC-013 | REQ-009 | the updated skill and its references | a reviewer searches canonical text | recording steps are present, link the canonical contract, and contain no model, provider, account or profile identifier | Maintainer | manual review (independent reviewer) |
| AC-014 | REQ-010 | the restored protocol document | every path cited by `ARCHITECTURE.md`, `CONTRIBUTING.md` and the protocol's status section is checked for existence | each cited path exists | Maintainer | manual (scripted existence check over the cited paths) |
| AC-015 | REQ-011 | a telemetry fixture whose briefs contain a title, prompt text and an absolute path | the import runs | none of those strings appear in the output | Maintainer | unit |

## 5. Open Consequential Decisions

These go to `design-solution`. None blocks P-1.

| Decision | Owner | Affected slice | Consequence if wrong | Required input / approval |
| --- | --- | --- | --- | --- |
| D1 Storage shape: a new `dispatch` event kind plus an optional dispatch identifier on existing kinds in `delivery-observations.json`, or a separate observation file | Maintainer | FS-1, FS-2 | A second store, or a schema that existing readers reject | Design note comparing both against `scripts/metrics/types.ts` and the "no telemetry store" rule in `progress-receipts.md` |
| D2 Telemetry adapter: port the maintainer-local Python script into `scripts/metrics/` as TypeScript with an OMP/Paseo adapter, or keep it outside the repository and import its output | Maintainer | FS-3 | Host-specific code inside a provider-neutral registry, or an unsupported local script | Design note on the adapter boundary |
| D3 Producer path: a small recording command the orchestrator calls, or an extension of the existing SDD helpers | Maintainer | FS-2 | Orchestrators skip recording because it is manual, or `sdd_progress.py` gains fields its contract forbids | Design note; the SDD receipt contract stays authoritative |

## 6. Extensions

### Capability Inventory

- Record observations
  - Record a dispatch (REQ-001)
  - Record a round, review verdict or acceptance against a dispatch (REQ-002 to REQ-005)
  - Record a terminal state (REQ-006)
- Report observations
  - Per-role and per-model dispatch rows (REQ-007)
  - Coverage and unavailable reasons (REQ-007)
- Import host telemetry
  - Window-bounded supervision and worker usage per dispatch (REQ-008)
  - Privacy filtering (REQ-011)
- Guide orchestrators (REQ-009)
- Repair documentation (REQ-010)

Deferred by the brief: model cards and admission (slice 3), roles and the routing rule (slice 2), host binding (slices 4–5).

### Decision Table: Dispatch Acceptance Outcome

| Acceptance observation names the dispatch | Decision | Authority reference present | Reported acceptance |
| --- | --- | --- | --- |
| yes | accepted | yes | accepted |
| yes | rejected | yes | rejected |
| yes | any | no | observation rejected by validation |
| no (names the change only) | any | yes | `unknown` |
| none recorded | — | — | `unknown` |

A review verdict never appears in this table, so it never sets acceptance.

### Interface And Data Contract Delta

This adds dispatch-scoped observations to the delivery observation contract and new rows to the metrics report. D1 decides the exact shape; this PRD fixes only the semantics in section 4.

### Risks And Change Impact

- **Data exposure:** telemetry contains prompts and paths. REQ-011 and AC-015 bound the output to aggregates.
- **Change impact:** delivery observation readers and their tests, the SDD skill references, the metrics report renderer, `ARCHITECTURE.md` §3.3–3.5 and `CONTRIBUTING.md`. Existing indicators stay unchanged (guardrail).

## 7. References

- Brief: `docs/brd/brd-role-based-model-routing.md` at `14ccf8faf`.
- Contracts: `scripts/metrics/types.ts`, `scripts/metrics/delivery.ts`, `skills/common/common-subagent-driven-development/references/progress-receipts.md`, `skills/common/common-task-complexity-routing/references/routing-table.md#capability-and-effort-resolution`, `ARCHITECTURE.md` §3.3.
- Deleted protocol: `docs/validation/context-aware-delegation-protocol.md`, added in #269 (`c60b42c11`) and deleted in #279 (`e042671b2`).
- Run record: none written for this planning run (`unknown`).

## 8. Implementation Plan, Task Slices And Verification Plan

Each slice routes independently per `routing-table.md#capability-and-effort-resolution`. Estimates are t-shirt sizes with confidence; none is a commitment.

| Slice | Type | Delivers | REQ / AC | Owner role | Repo targets | Depends on | Verification | Estimate |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| P-1 | prerequisite | Restored protocol document with a current status section | REQ-010 / AC-014 | Maintainer (docs) | `docs/validation/`, `ARCHITECTURE.md` §3.4, `CONTRIBUTING.md` | none | Scripted existence check of cited paths; manual review of the status section | S, high |
| FS-1 | feature | Dispatch observations validated and reported: a maintainer supplies an observation file and `pnpm metrics:report` shows per-role, per-model dispatch rows | REQ-001 to REQ-007 / AC-001 to AC-010 | Maintainer (metrics) | `scripts/metrics/types.ts`, `delivery.ts`, `report.ts`, tests | D1 | `pnpm test:metrics`; `pnpm metrics:report` on a fixture root | M, medium |
| FS-2 | feature | Orchestrator records observations during delegation: a delegated task leaves dispatch, round, verdict and acceptance observations that FS-1 reports | REQ-002 to REQ-006, REQ-009 / AC-013 | Maintainer (skills) | `common-subagent-driven-development` references, the recording path chosen in D3 | FS-1, D3 | One real delegated task produces observations that `pnpm metrics:report` reads; independent review of the skill text | M, low |
| FS-3 | feature | Host telemetry joined to dispatches: an import over a window attaches supervision and worker usage, and the report shows them | REQ-008, REQ-011 / AC-011, AC-012, AC-015 | Maintainer (metrics) | location chosen in D2 | FS-1, D2 | Fixture integration test; a run over the maintainer's local window compared with the brief's evidence figures | M, low |

Dependency order: P-1 can start now. FS-1 waits for D1. FS-2 and FS-3 follow FS-1, can run in parallel, and touch disjoint paths.

Review and approval: `tier=high`, so each feature slice gets an independent review, and the implementation plan needs human approval before code.

## Next Workflow

`design-solution` for D1–D3, covering FS-1 to FS-3. P-1 can go straight to `implementation-readiness`.
