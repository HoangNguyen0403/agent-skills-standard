# Feature Plan: Retrospective Diagnostic Signals And Decision Record

Status: Approved for technical design; approval: approved(requesting operator, 2026-11-16) covering `REQ-001..REQ-010`, `AC-001..AC-023`, the slice decomposition, OD-1 Option A, OD-2 Option A and routing to `design-solution`; source: operator request and report investigation of 2026-11-16 (no BRD-lite exists)
operator_profile: hybrid; lane: both
SNC: S=2 N=2 C=2 total=6 tier=high; model_tier: strong; delivery_mode: extended (consent text, a new read surface and a new agent-facing tool are trust-boundary changes)
Product/validation owner: requesting operator. Engineering owner: retrospective engine implementer(s). QA/review owner: independent reviewer, plus an independent security reviewer for Slices 3 and 4. Merge/release authority: requesting operator only.

## Decision Brief

- **Changes since approved revision:** None to requirements. Recorded the operator's approval and the two decisions (OD-1 Option A, OD-2 Option A).
- **Recommendation:** Make the existing numbers trustworthy first (tree coverage, Paseo agent linkage, failure runs, human turns, durations), then add an agent-recorded decision record so a report can state how many decisions agents took on their own, on what basis and at what impact.
- **Impact if wrong:** Reports keep describing a quarter of the delegated work as "complete", and unattended runs keep making unreviewed high-impact choices that no report counts. If the decision record is built but agents do not use it, the report shows a confident undercount; AC-017 and AC-020 exist to bound that.
- **Evidence and limitations:**
  - `confirmed(18 stored ledgers in the operator's local store, read 2026-11-16, aggregate counts only)`: 163 of 217 created agents (75%) had no session read, yet all 15 measured reports state `coverage: complete`; `hypotheses` is 0 in 18 of 18; 26 of 53 improvement items describe the tool's own blind spots; 3 reports are tracker-only shells.
  - `confirmed(mcp/src/retrospective/ledger.ts:1139-1145)`: overall coverage considers only file truncation and tracker-only mode.
  - `confirmed(mcp/src/retrospective/ledger.ts:2483-2489)`: `partial` coverage blocks recommendation claims, so tree coverage must be its own dimension rather than a new meaning for `coverage`.
  - `confirmed(mcp/src/retrospective/aggregate.ts:282,294)`: `userMessages` and the full `stopReasons` map are aggregated; only error and aborted counts reach the ledger.
  - `confirmed(mcp/src/retrospective/discovery.ts:772-826)`: children are found only through a `parentSession` header or a nested OMP `task` directory.
  - `confirmed(structural probe of 400 local Paseo agent records, keys and counts only)`: records carry `id`, `provider`, `persistence.sessionId` and `labels["paseo.parent-agent-id"]`; 282 of 282 sampled child records name a session file that exists under the already-consented `~/.omp/agent/sessions` root.
  - `confirmed(mcp/src/retrospective/run.ts:367-368, index-report.ts:478)`: the stored ledger is a strict schema pinned to `schemaVersion: 1`; any new field is a schema version change.
  - `confirmed(mcp/src/retrospective/lookup-results.ts:1-12)`: the engine already parses this server's own tool results under a bounded contract, a precedent for reading this server's own decision events from a session file.
  - `confirmed(docs/session-retrospective-privacy.md:185-186)`: the privacy document lists typed outcomes, retry and verification result codes as collected; the ledger contains none.
  - `assumed`: the main session's own Paseo record can always be found by its session identifier; providers other than OMP expose the same four fields.
  - `unknown`: how often agents will record decisions without prompting; measured after release, not estimated here.
- **Unresolved decision:** None. OD-1 and OD-2 are decided (see Open Consequential Decisions).
- **Approval sought:** None for this document. The approval above grants technical design only. It grants no implementation, merge, release, consent change on any machine, spend or runtime activation authority; `tier=high` keeps a HARD STOP before code, and the design needs its own approval.
- **Independently ready slices:** None before design approval. After it, Slice 1 starts first; Slices 2 and 3 follow it.

## Outcome And Guardrails

- **Objectives (PRD-local labels; no BRD objective IDs exist):**
  - `O1` A reader can tell how much of the delegated work a report actually saw.
  - `O2` A report shows where a session struggled: repeated failures, human turns, waits.
  - `O3` A report counts the decisions agents took without a human, split by basis and impact, so high-impact unreviewed choices are visible.
- **Primary metric:** share of created agents whose session was read. Baseline 54 of 217 (25%). Target: measure first on sessions prepared after release; the operator sets the threshold from that measurement.
- **Secondary metric:** share of substantive prepared sessions with at least one decision record. Baseline 0.
- **Guardrails:**
  - No message text, reasoning, system prompt, free-form tool argument or tool output is read beyond the allowlist in `docs/session-retrospective-privacy.md`, extended only by the fields named in REQ-002 and REQ-006.
  - Zero model calls, zero outbound requests, owner-only file permissions, strict CSP with zero `<script>` and full HTML escaping stay as they are.
  - Tool responses stay fixed receipts: no report text, no decision label, no Paseo path is returned to an agent.
  - Findings stay `observed` or `candidate`. No global score. A decision record is a record, never an approval and never a gate on the agent.
  - Consent stays a human-typed action; no agent, flag or tool can grant or upgrade it.

## Scope And Non-Goals

- **Scope fence:** the six items the operator selected on 2026-11-16: coverage honesty, Paseo linkage, surfacing already-aggregated signals, failure-run detection, durations, and the decision record.
- **Capability inventory (in scope):**
  - *State* tree coverage separately from file coverage → `REQ-001`.
  - *Link* Paseo-created agents into the delegation tree → `REQ-002`.
  - *Report* human turns and the stop-reason distribution → `REQ-003`.
  - *Detect* repeated-failure runs → `REQ-004`.
  - *Report* durations and waits → `REQ-005`.
  - *Record* a decision as a structured event → `REQ-006`.
  - *Report* decisions per session and across sessions → `REQ-007`.
  - *Guide* agents to record decisions → `REQ-008`.
  - *Keep* stored reports readable → `REQ-009`.
  - *Align* privacy, consent and documentation with what is collected → `REQ-010`.
- **Deferred (owner: requesting operator; revisit after the secondary metric is measured):** verification-result events, correction or rejection markers, slice accounting, corrective follow-up counts, a human write-back that marks a decision reviewed.
- **Non-goals (excluded):** reading message text or tool output to infer root cause; any model call; blocking or gating an agent on a decision; automatic preparation changes; host panels; readers for Claude Code or Gemini; rewriting stored generations.
- **Owned gap:** `gap(GAP-1, engineering owner, decision during design)` — four claim templates are declared but never emitted (`correction-concentration`, `approval-friction`, `delegation-accounting`, `coordination-wait`). Design either reuses them for REQ-001, REQ-002 and REQ-005 or removes them.

## Requirements And Acceptance Criteria

| Req ID | Requirement | Owner | Priority | Status | Objective |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | Every report states tree coverage (created agents read vs created) as its own state beside file coverage, in the header of `summary.md`, `report.html` and the index row. A bare "Coverage: complete" never appears when a created agent was not read. | Slice 1 engineer | P0 | Draft | O1 |
| REQ-002 | Agents created through Paseo are linked into the delegation tree and read when their session file lies inside a consented source root. Only `id`, `provider`, `persistence.sessionId` and `labels["paseo.parent-agent-id"]` are taken from a Paseo agent record. Reading those records requires a new consent text version. | Slice 3 engineer | P0 | Draft; blocked(Slice 3, requesting operator, OD-2) | O1 |
| REQ-003 | Each report shows the count of human messages in the main session with a rate per 100 assistant turns, and the distribution of assistant stop reasons as bounded identifiers. | Slice 2 engineer | P1 | Draft | O2 |
| REQ-004 | Each report shows repeated-failure runs: consecutive failed calls of the same tool by the same agent at or above a named threshold, with run count, longest run and tool name. A run at or above the threshold produces an improvement item. | Slice 2 engineer | P0 | Draft | O2 |
| REQ-005 | Each report shows wall time for the tree, active span per agent, idle gaps on the main session at or above a named threshold, and permission ask-to-answer latency. A value whose timestamps are missing reads "not measured". | Slice 2 engineer | P1 | Draft | O2 |
| REQ-006 | Any agent, orchestrator or worker, can record a decision through this server using the Decision Record Contract below. A recorded decision survives a server restart and is attributed to the agent that recorded it. | Slice 4 engineer | P0 | Draft; blocked(Slice 4, requesting operator, OD-1) | O3 |
| REQ-007 | Each report shows recorded decisions: total, split by basis, a basis-by-impact table, and the rule identifiers cited with counts. High-impact decisions taken on a default produce an `act` improvement item. The index shows them per session and for the window. Every decision figure is labelled agent-declared and unverified. | Slice 4 engineer | P0 | Draft | O3 |
| REQ-008 | Canonical skill guidance tells agents when a choice counts as a decision, how to classify basis and impact, and to record it. The change is made in registry source, kept minimal for token cost, and proven by evaluation. | Slice 5 engineer | P0 | Draft | O3 |
| REQ-009 | Reports stored before this change stay readable in the index and trend views. Fields they lack read "not measured". No stored generation is rewritten. | Slice 1 engineer | P0 | Draft | O1 |
| REQ-010 | The privacy document, consent text, host limits and the skill's local-preparation reference describe exactly what is read and collected after this change, including removal or implementation of collection claims the engine does not meet today. | Slice 6 engineer | P0 | Draft | O1, O2, O3 |

### Decision Record Contract (canonical for REQ-006, REQ-007, REQ-008)

A choice is a decision when the agent selects between materially different outcomes without a human explicitly selecting that outcome in the current instruction. Record both agent selections made by applying a named pre-approved rule (`rule`) and otherwise-authorized default selections (`default-pending-review`). Carrying out an explicitly human-selected outcome or picking a routine tool is not a decision. Recording never permits bypassing a required approval or performing an otherwise-prohibited action. Clarified during independent review on 2026-11-16 to reconcile the existing rule-based examples with this definition; no new action authority is granted.

| Field | Values | Rule |
| --- | --- | --- |
| `basis` | `rule`, `default-pending-review` | `rule`: a pre-approved rule, policy or approved plan item settled it. `default-pending-review`: nothing pre-approved covered it; the agent took a default to keep working and a human should review it. |
| `impact` | `high`, `medium`, `low` | `high`: hard to reverse, or touches auth, money, data integrity, secrets, a trust boundary, a public contract, a release, or approved scope. `medium`: reversible and changes behaviour, interface or scope inside the assigned work. `low`: reversible, local, no behaviour or contract change. Round up on doubt. |
| `ruleRef` | bounded identifier | Required when `basis` is `rule`; names the rule, skill or plan item relied on. Absent otherwise. |
| `reversible` | `true`, `false` | The agent's own statement. |
| `label` | up to 120 characters, sanitized and secret-redacted | Present only if OD-1 selects it. Stored locally, shown as agent-supplied and unverified, never returned by a tool. |

| AC ID | Req ID | Given | When | Then | Owner | Verification lane |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | A session where 5 of 24 created agents were read and every read file is complete | The report is prepared | The header shows file coverage complete and tree coverage partial with "5 of 24 agents read"; no bare "Coverage: complete" appears. | QA / Reviewer | Unit |
| AC-002 | REQ-001 | A session where every created agent was read, including the case of zero created | The report is prepared | Tree coverage reads complete with the counts shown. | QA / Reviewer | Unit |
| AC-003 | REQ-002 | A synthetic Paseo store where the main session's record has three descendants, one of them a grandchild, all with session files inside a consented root | The report is prepared under the new consent version | All three are read as nodes with correct parent edges and unlinked agents is 0. | QA / Reviewer | Integration |
| AC-004 | REQ-002 | A descendant whose session file is missing, outside every consented root, or a symbolic link | The report is prepared | That file is not opened; the agent is counted unlinked with an explicit gap. | Security reviewer | Integration |
| AC-005 | REQ-002 | A consent record at version 4 | Any retrospective command or tool runs after the upgrade | Consent reads disabled with reason `version`, no Paseo record is opened, and the status text names `ags retrospective enable`. | Security reviewer | Unit |
| AC-006 | REQ-002 | Hostile Paseo records: oversized, malformed, a parent cycle, a path-shaped session identifier, a symbolic-linked record | The report is prepared | Each is skipped within fixed bounds; traversal terminates; no path outside the consented roots is opened. | Security reviewer | Unit |
| AC-007 | REQ-003 | A main session with a known count of human messages and assistant turns ending in several stop reasons, one outside the identifier grammar | The report is prepared | Human messages and the per-100-turns rate match the fixture; stop reasons list with counts; the out-of-grammar value appears only as a bucketed or hashed label. | QA / Reviewer | Unit |
| AC-008 | REQ-004 | An agent with consecutive failed calls of one tool at the threshold | The report is prepared | Run count, longest run and tool name match the fixture and the failure-run improvement item is present. | QA / Reviewer | Unit |
| AC-009 | REQ-004 | The same number of failures of one tool, each separated by a success, or split across two agents | The report is prepared | No run is reported and no failure-run improvement item is present. | QA / Reviewer | Unit |
| AC-010 | REQ-005 | A tree with complete timestamps and one main-session gap above the idle threshold | The report is prepared | Wall time, per-agent active span, idle gap count and longest gap match the fixture. | QA / Reviewer | Unit |
| AC-011 | REQ-005 | Permission requests where some have both request and answer timestamps and some lack one | The report is prepared | Median and maximum latency cover only the timed pairs; with none timed the value reads "not measured", never 0. | QA / Reviewer | Unit |
| AC-012 | REQ-006 | A valid decision per the contract | An agent records it | It is stored, and the tool response is a fixed receipt containing no field value supplied by the agent. | QA / Reviewer | Integration |
| AC-013 | REQ-006 | An unknown enum value, `basis` of `rule` without `ruleRef`, a `ruleRef` outside the identifier grammar, or an over-length label | An agent records it | The call is rejected and nothing is stored. | QA / Reviewer | Unit |
| AC-014 | REQ-006 | A label containing a secret-shaped token and control characters (only if OD-1 selects labels) | An agent records it | The stored label is redacted and sanitized by the same rules as permission command text. | Security reviewer | Unit |
| AC-015 | REQ-006 | Decisions recorded by the main agent and by a linked worker, followed by a server restart | The report is prepared | Every decision is present once and attributed to the agent that recorded it. | QA / Reviewer | Integration |
| AC-016 | REQ-007 | A session with a known mix of decisions | The report is prepared | Total, basis split, the basis-by-impact table and cited rule identifiers with counts match the fixture in `summary.md`, `ledger.json` and `report.html`, each labelled agent-declared and unverified. | QA / Reviewer | Unit |
| AC-017 | REQ-007 | A session with no decision record, and a report stored before this change | The report and the index are rendered | The session reads "none recorded; unrecorded decisions are not counted"; the older report reads "not measured". Neither reads as zero decisions made. | QA / Reviewer | Unit |
| AC-018 | REQ-007 | One session with a high-impact `default-pending-review` decision, another with only medium and low ones | The reports are prepared | The first carries an `act` improvement item naming the count; the second carries it at `watch`. | QA / Reviewer | Unit |
| AC-019 | REQ-007 | A store with two or more sessions holding decisions | The index is built | Each row shows its pending high-impact count and the window shows totals by basis and impact. | QA / Reviewer | Unit |
| AC-020 | REQ-008 | Held-out cases: an unattended agent meets a consequential choice no rule covers; an agent applies a named rule; an agent follows an explicit instruction | Run with and without the guidance, model and tools fixed | With the guidance the first two are recorded with the correct basis and impact and the third is not recorded; results beat the without-guidance baseline and failures are preserved. | Independent reviewer | Evaluation |
| AC-021 | REQ-009 | A store holding reports written before this change | The index and a trend comparison are built | Older reports render, their missing fields read "not measured", and their files are byte-identical afterwards. | QA / Reviewer | Integration |
| AC-022 | REQ-010 | The changed engine | Documentation is updated | The privacy document names every newly read field and the new consent version, and its "what is collected" list matches the ledger with no unmet claim. | Independent reviewer | Doc parity review |
| AC-023 | REQ-010 | A synthetic store and synthetic sessions, never the operator's real store | A report is prepared end to end and opened | Zero model calls and zero outbound requests are recorded, files are owner-only, the page has no script or external URL, and no tool response carries a label or a Paseo path. | Security reviewer | Integration |

## Open Consequential Decisions

| Decision | Owner | Affected slice | Consequence if wrong | Required input / approval |
| --- | --- | --- | --- | --- |
| OD-1: Does a decision carry a short agent-supplied label? Option A: yes, up to 120 characters, redacted, local only, as the report title already is. Option B: enum fields only. | Requesting operator | Slice 4 | A: agent-written text enters the local store; redaction is imperfect. B: a reviewer sees counts but cannot tell which decision is which without opening the transcript. | Decided: Option A, approved(requesting operator, 2026-11-16) |
| OD-2: Approve consent text version 5 so the engine may read four fields of Paseo agent records. Option A: approve. Option B: decline and keep Paseo agents unlinked. | Requesting operator | Slice 3 | A: every machine's consent goes disabled until a human re-runs `ags retrospective enable`; a new directory is read. B: about three quarters of delegated work stays unseen and REQ-002 is dropped. | Decided: Option A, approved(requesting operator, 2026-11-16); exact wording is DD-2 in the SRS |

Delegated to slice engineers, provided the ACs hold: the failure-run threshold (default 3, matching the existing "answered 3 or more times" rule), the idle-gap threshold, section order and wording in the views, and the name of the new tool and improvement rule ids.

## Risks And Change Impact

| Risk | Effect | Handling |
| --- | --- | --- |
| Decisions are self-reported | Undercount or flattering classification | Agent-declared label on every figure; "none recorded" never reads as zero (AC-017); cited rule identifiers are shown so empty `rule` claims are visible (AC-016); evaluation in AC-020. |
| Consent version bump | Retrospective is disabled on every machine until re-enabled | Status text names the command (AC-005); release note. |
| New read surface | Paseo records also hold titles, working folders and configuration | Four-field allowlist in REQ-002; hostile-record handling (AC-006); security review. |
| Ledger schema version change | Builds older than this change cannot index newer reports | Newer builds read both versions (AC-021); stated in the release note. |
| Guidance adds prompt weight | Token cost on every session that loads the skill | REQ-008 keeps the change minimal; cost is reported with the evaluation run. |

## Status And Receipt

- `feature_status`: `requirements_ready`; approval pending.
- Run record: this file. No `artifacts/runs/` record is minted until execution starts.

## References

- Source modules: `mcp/src/retrospective/aggregate.ts`, `ledger.ts`, `improvements.ts`, `discovery.ts`, `consent.ts`, `run.ts`, `index-report.ts`, `trend.ts`, `lookup-results.ts`, `views/summary.ts`, `views/report-html.ts`; `mcp/src/tools/retrospective.ts`; `cli/src/commands/retrospective.ts`.
- Documents: `docs/session-retrospective.md`, `docs/session-retrospective-privacy.md`, `docs/session-retrospective-hosts.md`, `skills/common/common-session-retrospective/references/local-preparation.md`.
- Prior plan: `docs/prd/prd-ags-diagnostic-ux.md` (views; it excluded ledger schema and consent changes, which this plan brings into scope).
- Technical design: `docs/srs/srs-retrospective-diagnostic-signals.md`, `docs/srs/adr-retrospective-diagnostic-signals.md`, `docs/srs/srs-walkthrough-retrospective-diagnostic-signals.md` (design approval pending; it proposes narrowing `REQ-003` as DD-1 and resolves `GAP-1`).

## Implementation Plan, Task Slices And Verification Plan

| Slice | Sole owner / files | Contract and deliverable | Dependencies | SNC / size / confidence / tier hint |
| --- | --- | --- | --- | --- |
| **Slice 1: Tree coverage and readable history** | Slice 1 engineer (`ledger.ts`, `run.ts`, `views/summary.ts`, `views/report-html.ts`, `index-report.ts`, `trend.ts`, matching specs) | `REQ-001`, `REQ-009` (`AC-001`, `AC-002`, `AC-021`): tree coverage in all three views and the index; ledger schema version that newer builds read alongside version 1. | Design approved | S=1 N=1 C=1 medium / M / high / `standard` |
| **Slice 2: Session struggle signals** | Slice 2 engineer (`aggregate.ts`, `ledger.ts`, `improvements.ts`, the two views, matching specs) | `REQ-003`, `REQ-004`, `REQ-005` (`AC-007`..`AC-011`): human turns, stop reasons, failure runs with improvement item, durations and waits. | Slice 1 (same files) | S=1 N=2 C=1 medium / L / medium / `standard` |
| **Slice 3: Paseo agent linkage** | Slice 3 engineer (`discovery.ts`, `consent.ts`, `contracts.ts`, `retrospective-cli.ts`, `cli/src/commands/retrospective.ts`, matching specs) | `REQ-002` (`AC-003`..`AC-006`): linked descendants, consent version 5, hostile-record bounds. | OD-2; design approved; may run beside Slice 2 if design confirms no shared file | S=2 N=2 C=2 high / L / medium / `strong` |
| **Slice 4: Decision record, end to end** | Slice 4 engineer (new tool under `mcp/src/tools/`, server registration, `aggregate.ts`, `ledger.ts`, `improvements.ts`, the two views, `index-report.ts`, matching specs) | `REQ-006`, `REQ-007` (`AC-012`..`AC-019`): record, persist across restart, attribute, report, index. | OD-1; Slice 2 (same files); design approved | S=2 N=2 C=2 high / L / medium / `strong` |
| **Slice 5: Recording guidance and evaluation** | Slice 5 engineer (canonical `skills/common/` source chosen in design, its `evals/evals.json`, regenerated exports through existing tooling) | `REQ-008` (`AC-020`): minimal guidance plus held-out evaluation. | Slice 4 tool contract frozen | S=1 N=1 C=1 medium / M / medium / `standard` |
| **Slice 6: Documentation parity and synthetic end-to-end check** | Docs engineer (`docs/session-retrospective*.md`, canonical `local-preparation.md`) | `REQ-010` (`AC-022`, `AC-023`). | Slices 1–5 | S=1 N=0 C=1 low, raised to medium by the trust-boundary floor / S / high / `standard` |
| **Slice 7: Independent review** | Independent reviewer and security reviewer, no implementation ownership | PASS / FAIL / NOT RUN evidence for `AC-001..AC-023`; security review of Slices 3 and 4. | Slice 6 | — / S / high / `standard` |

`assumed` candidate for design, not a requirement: decision events can be read from the recording agent's own session file as calls to this server's tool, the way lookup results are read today. That would meet the restart and attribution clauses of REQ-006 without a second store, and it makes a worker's decisions visible only when Slice 3 has linked that worker.

### Verification Procedure (Planned — Not Yet Executed)

1. Focused specs per slice: `rtk pnpm --filter agent-skills-standard-mcp test -- <spec files>` (`test` is `vitest run`, `confirmed(mcp/package.json)`), then `rtk pnpm --filter agent-skills-standard-mcp lint:check`.
2. Slice 5: the repository's skill evaluation run for the changed skill, with and without the guidance, model and tools fixed.
3. Slice 6: build a disposable store and synthetic OMP and Paseo fixtures under `os.tmpdir()`, prepare a report, build the index, open both pages in a browser with zero console or CSP errors, then delete the directory. The operator's real store and session files are never used as fixtures.

## Next Workflow

Design is drafted in `docs/srs/srs-retrospective-diagnostic-signals.md` and awaits operator approval. Then `implementation-readiness`. No code before that approval (`tier=high` HARD STOP).
