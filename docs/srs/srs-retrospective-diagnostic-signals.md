# Technical Design (SRS/FRS): Retrospective Diagnostic Signals And Decision Record

**Status**: Approved for repository implementation and synthetic local verification, requesting operator, 2026-11-16; execution: Subagent-Driven (selected through the execution form) | **Owner**: retrospective engine implementer(s) | **Delivery mode**: extended | **Last Updated**: 2026-11-16
SNC: S=2 N=2 C=2 total=6 tier=high. Scope owner and approval authority: requesting operator. Approval includes DD-1 (user-role messages, not claimed human turns) and DD-2 (consent text version 5); no merge, release, private-session collection, spend, runtime activation or consent mutation authority.

## Decision Brief

- **Changes since approved revision:** Initial design.
- **Recommendation:** Five design decisions.
  1. Tree coverage becomes its own ledger field; the existing `coverage` field keeps its meaning.
  2. The ledger moves to `schemaVersion: 2`, defined in full up front with nullable sections, so later slices fill sections without touching the schema. Readers accept versions 1 and 2. Nothing stored is migrated.
  3. Paseo agents are linked through agent records in a separately consented root. Four fields are kept. The session file is found by file name inside the already-consented source roots and its identity is re-checked from the file itself.
  4. A decision is persisted by the host transcript, not by this server. `record_decision` is a stateless validator; the engine reads its own tool's calls from session files and validates them again ([ADR](adr-retrospective-diagnostic-signals.md)).
  5. All new signals are computed in the existing single streaming pass per session file.
- **Impact if wrong:** Decision 4 is the costly one to reverse. If transcripts prove an unreliable store, decisions are undercounted on hosts without a reader and a server-side store must be added later. Decision 3 widens what the engine reads; a wrong bound exposes other fields of Paseo records.
- **Evidence and limitations:** see [walkthrough](srs-walkthrough-retrospective-diagnostic-signals.md). No code was written or run; every behaviour below is designed, not observed.
- **Decisions:** DD-1 and DD-2 accepted by the requesting operator's instruction to implement this design on 2026-11-16. DD-1 reports user-role messages split by attribution, steering and permission notifications, never inferred human-message counts. DD-2 accepts the proposed version-5 consent wording; actual consent remains a separate human action on each machine.
- **Authority:** Repository implementation and synthetic local verification only, under Subagent-Driven execution. Merge, release, private-session collection, spend, runtime activation and actual consent changes remain outside authority.
- **Independently ready slices:** Slice 1 after approval. Slices 2 and 3 can then run side by side: with the full schema fixed by Slice 1 they own disjoint files.

## Trace Source

- **PRD and revision:** [prd-retrospective-diagnostic-signals.md](../prd/prd-retrospective-diagnostic-signals.md), approved 2026-11-16 with OD-1 Option A (decisions carry a label) and OD-2 Option A (consent version 5).
- **Source requirement IDs:** `REQ-001..REQ-010`, `AC-001..AC-023`.
- **Scope statement:** engine, tool, consent, stored-ledger readers, views and documentation contracts for those requirements. View wording, section order and CSS are left to slice engineers within the contracts below.

## Architecture And Contract Delta

| ID | Component | Files | Change |
| --- | --- | --- | --- |
| CMP-1 | Discovery | `mcp/src/retrospective/discovery.ts`, new `agent-records.ts` | Split created-agent counting by source; link host agents from agent records; parent edges in the manifest. |
| CMP-2 | Consent | `consent.ts`, `mcp/src/retrospective-cli.ts`, `cli/src/commands/retrospective.ts` | Text version 5; optional `allowedAgentRecordRoots`; new flags. |
| CMP-3 | Aggregation | `aggregate.ts`, `server-tools.ts` | User-row breakdown, failure runs, row gaps, permission latency, decision events. |
| CMP-4 | Ledger | `ledger.ts`, `improvements.ts`, new `decision-contract.ts` | Schema version 2, six claim templates, two improvement rules, verification of new sections. |
| CMP-5 | Stored-ledger readers | `run.ts`, `index-report.ts`, `trend.ts` | Accept versions 1 and 2. |
| CMP-6 | Views | `views/summary.ts`, `views/report-html.ts`, `index-report.ts` | Header contract, new rows and sections, rule catalogs. |
| CMP-7 | Decision tool | new `mcp/src/tools/decision.ts`, `server.ts` | `record_decision`, stdio only. |
| CMP-8 | Guidance | `server.ts` instructions, `cli/src/services/IndexGeneratorServiceImpl.ts`, `skills/common/common-decision-discipline/` | When and how to record. |
| CMP-9 | Documentation | `docs/session-retrospective*.md`, `skills/common/common-session-retrospective/references/local-preparation.md` | Parity with what is read and collected. |

- **Dependency direction:** tools → `decision-contract.ts` ← aggregation. Views and index read the ledger only. `agent-records.ts` is called by discovery only and imports nothing from aggregation.
- **Data ownership:** the consent record owns every readable root. The ledger owns every reported number. The host transcript owns decision events.
- **Slice ordering change from the PRD:** Slice 1 delivers the complete version 2 schema below, with `activity`, `failureRuns`, `time` and `decisions` set to `null`. Slice 2 fills the first three, Slice 4 fills `decisions`, Slice 3 fills host-agent linkage and owns `run.ts` wiring after Slice 1.

### Ledger version 2 (canonical contract)

Version 1 fields are unchanged. Version 2 adds:

```ts
schemaVersion: 2;
treeCoverage: {
  state: "complete" | "partial" | "not-measured";   // not-measured: tracker-only run
  agentsCreated: number; agentsRead: number; unlinked: number;
  task: { created: number; read: number };
  hostAgents: { created: number; read: number;
                source: "agent-records" | "call-count"; truncated: boolean };
};
activity: null | {
  userRows: { total: number; steering: number; permissionNotifications: number;
              byAttribution: Array<{ key: string; count: number }> };   // main session
  userRowsPer100TurnsTenths: number;
  stopReasons: Array<{ reason: string; count: number }>;                // tree, top 8 + "other"
};
failureRuns: null | {
  minLength: number; runs: number;
  longest: null | { length: number; tool: string; agent: string };
  tools: Array<{ tool: string; runs: number; longest: number }>;        // top 5
};
time: null | {
  wallSeconds: number;
  main: { idleGapMinSeconds: number; idleGaps: number;
          longestGapSeconds: number; idleSeconds: number };
  permissionLatency: null | { timed: number; medianSeconds: number; maxSeconds: number };
};
decisions: null | {
  total: number;
  byBasis: { rule: number; defaultPendingReview: number };
  byImpact: Record<"high" | "medium" | "low", { rule: number; defaultPendingReview: number }>;
  irreversible: number; rejected: number; unconfirmed: number;
  ruleRefs: Array<{ ref: string; count: number }>; otherRuleRefs: number; // top 20
  items: Array<{ at: string; agent: string; basis: "rule" | "default-pending-review";
                 impact: "high" | "medium" | "low"; reversible: boolean;
                 ruleRef: string | null; label: string }>;                // at most 200
  itemsOmitted: number;
};
// agents[] rows gain: activeSeconds: number | null
```

`null` means not measured. A measured section with zero events is a real zero. Every numeric claim value keeps its own `agg:claim:<template>:<key>` evidence entry, as today.

Claim templates in version 2: the twelve emitted today plus `delegation-accounting`, `coordination-wait`, `approval-friction` (already declared, never emitted) and `turn-activity`, `failure-runs`, `decisions` (new). `correction-concentration` is removed from version 2 because nothing can feed it. This closes PRD `GAP-1`.

Improvement rules added: `failure-run` (destination `tool-setup`) and `decision-review-backlog` (destination `decision-review`), both for the manager audience.

## Technical Requirements

### SRS-001: Ledger version 2 and reader compatibility

- **Statement**: The engine shall write version 2 ledgers and shall read version 1 and version 2 ledgers wherever a stored ledger is parsed.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-009, AC-021
- **Behavior**: `storedLedgerSchema` in `run.ts` becomes a union of the present schema, frozen as version 1, and a strict version 2 schema. `loadCommittedLedger` keeps returning the committed numbers of an already-published checkpoint, whichever version it holds. `index-report.ts` accepts `schemaVersion` 1 or 2 where it accepts only 1 today. `trend.ts` has no version gate and stays as is. Fields a version 1 ledger lacks render as "not measured"; tree coverage for version 1 rows is derived from the `coverage` claim values `agentsCreated`, `agentsRead` and `unlinkedAgents`, which every stored report has.
- **Failure / fallback**: any other version is counted unreadable by the index and fails `loadCommittedLedger` with `STORED_LEDGER_INVALID`. A build older than this change counts version 2 ledgers as unreadable; that is disclosed, not prevented.
- **NFR / security impact**: no stored generation is opened for writing; version 1 files are byte-identical after any command.
- **Verification**: integration — `mcp/test/retrospective-index.spec.ts`, `retrospective-trend.spec.ts`, `retrospective-run.spec.ts` against a frozen version 1 fixture, with a before/after hash of the fixture files.

### SRS-002: Tree coverage

- **Statement**: The ledger shall state tree coverage separately from file coverage, and every view shall show both.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-001, AC-001, AC-002
- **Behavior**: `treeCoverage.state` is `complete` when `unlinked` is 0, else `partial`. `agentsRead` equals `sessionsLinked − 1`. `unlinked` is the sum of `created − read` for `task` and for `hostAgents`, each clamped at 0. The `delegation-accounting` claim carries the numbers. The first line of `summary.md` (`summary.ts:350`) and the report header (`report-html.ts:374-377`) replace `Coverage: … | Delegation: …` with `Files: <coverage> | Tree: <state> (<read> of <created> agents read)`. Zero created reads `Tree: complete (0 agents created)`. The index row shows `read/created`.
- **Failure / fallback**: a tracker-only run sets `state` to `not-measured`. `ledger.coverage`, `BAD_COVERAGE` and `PARTIAL_RECOMMENDATION` (`ledger.ts:2483-2489`) are untouched, so a partial tree never blocks a claim.
- **NFR / security impact**: `verifyLedger` recomputes the section from `LedgerInput` and reports `NUMBER_MISMATCH` on any difference.
- **Verification**: unit — `retrospective-ledger.spec.ts`, `retrospective-views.spec.ts`, `retrospective-report-html.spec.ts`.

### SRS-003: Consent version 5 and the agent-record root

- **Statement**: Reading agent records shall require a consent record at text version 5 that names the agent-record roots.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-002, REQ-010, AC-005
- **Behavior**: `CONSENT_TEXT_VERSION` becomes `"5"`. `ConsentRecord` gains optional `allowedAgentRecordRoots: string[]` (absolute, unique; absent means empty), so a version 4 record still parses and is then refused with reason `version`, as AC-005 requires. `consentStillValid` (`run.ts:538-555`) also compares the new list. `ags retrospective enable` accepts `--agent-record-root <abs>` (repeatable) and `--no-agent-records`; with neither, `~/.paseo/agents` is proposed when one `lstat` shows a real directory. The prompt lists agent-record roots under their own heading and `status` prints them. Each root passes the existing canonicalization and unsupported-store checks and must not overlap the store root or any source root. Proposed text additions, pending DD-2:
  - "Agent records are read only from the listed agent-record roots. Four fields of each record are kept: agent id, provider, session id and parent agent id. They are used to find which sessions belong to one run."
  - "Reports include decisions that agents recorded through this server's record_decision tool, with a short agent-written label. Secrets are removed from labels on a best-effort basis."
- **Failure / fallback**: with an empty list no agent record is opened and host agents are counted from `create_agent` calls as today (`hostAgents.source: "call-count"`). A version 5 record read by an older build fails its strict schema and reads disabled, reason `invalid`.
- **NFR / security impact**: consent remains a typed human `yes`; no flag, tool or agent grants or upgrades it.
- **Verification**: unit — `retrospective-consent.spec.ts`, `retrospective-cli.spec.ts`, `cli/src/commands/__tests__/RetrospectiveCommand.spec.ts`.

### SRS-004: Agent-record reader and host-agent linkage

- **Statement**: Discovery shall link the descendants of the main session's agent through agent records and shall add a descendant as a node only after its session file is found inside a consented source root and its identity is confirmed.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-002, AC-003, AC-004, AC-006
- **Behavior**:
  1. `agent-records.ts` reads `<root>/<dir>/<name>.json`, exactly two levels. It skips symbolic links and non-regular entries, opens with `O_RDONLY | O_NOFOLLOW | O_NONBLOCK`, checks type and size on the open descriptor, parses, and keeps only `id`, `provider`, `persistence.sessionId` and `labels["paseo.parent-agent-id"]`. Identifiers must match `^[A-Za-z0-9-]{8,128}$`, the provider `^[A-Za-z0-9._-]{1,32}$`, and `id` must equal the file name without its extension. Anything else is dropped before the function returns.
  2. The root agent is the single record whose session id equals the bound main session id. Descendants are found breadth-first by parent id with a visited set.
  3. For each descendant, discovery looks for exactly one file named `<sessionId>.jsonl` or `*_<sessionId>.jsonl` in a source root or one directory below it, using directory listings only. The path must pass `isInsideAllowedRoots` and be a regular, non-linked file. The session id read from the file's own `session` row must equal the expected id.
  4. A confirmed descendant becomes a manifest node whose parent is its parent agent's session when that is linked, else the main session.
  5. `createdAgentsCount` (`discovery.ts:287-299`) is split into `task` and `create_agent` counts. With a root agent found, `hostAgents.created` is the descendant count and `source` is `agent-records`.
- **Failure / fallback**: no root agent, or more than one, leaves `source` at `call-count` with no guess. A missing file, more than one match, an out-of-root path, a link or an identity mismatch leaves that agent unlinked. Hitting a bound stops the scan and sets `truncated`, which forces `treeCoverage.state` to `partial`.
- **NFR / security impact**: bounds — 4,096 directories, 20,000 records, 65,536 bytes per record (largest observed 2,711), 256 descendants, depth 16, all under the existing discovery abort signal. No path taken from a record is ever opened; only identifiers leave the reader. `task` sub-agents of linked workers are not read; this is a stated limit. Aggregation still caps the tree at 64 nodes and one shared 60-second deadline (`run.ts:92-95`), so a large linked tree can turn file coverage `partial`.
- **Verification**: integration and security — new `mcp/test/retrospective-agent-records.spec.ts` and `retrospective-discovery.spec.ts`, with fixtures for a grandchild, a parent cycle, an oversized record, malformed JSON, a path-shaped id, a linked record and a file outside every root.

### SRS-005: Turn activity

- **Statement**: The ledger shall report user-role messages of the main session, broken down, and the distribution of assistant stop reasons across the tree.
- **Priority**: Should | **Status**: Draft; blocked(Slice 2, requesting operator, DD-1) | **Source**: REQ-003, AC-007
- **Behavior**: per node the aggregator counts user rows in total, those with `steering: true`, those that parse as a permission request, and a bounded map keyed by `attribution` (grammar `^[a-z][a-z0-9_-]{0,31}$`, else `other`). The already-aggregated `stopReasons` map (`aggregate.ts:1126-1132`) is carried into the ledger; reasons outside `^[A-Za-z0-9._:-]{1,48}$` are summed under `other`. Claim: `turn-activity`. The view states that user-role messages can include host notifications.
- **Failure / fallback**: tracker-only runs leave `activity` null.
- **NFR / security impact**: no message text is stored; `attribution` and `steering` are two new allowlisted structural fields.
- **Verification**: unit — `retrospective-aggregate.spec.ts`, `retrospective-ledger.spec.ts`.

### SRS-006: Failure runs

- **Statement**: The ledger shall report failure runs and raise an improvement item when one exists.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-004, AC-008, AC-009
- **Behavior**: a failure run is a sequence of results of one tool, by one agent, that are all errors and number at least `FAILURE_RUN_MIN_LENGTH` (default 3). Results of other tools do not break it; a success of the same tool ends it. Runs are detected from `toolResult` rows in file order (`aggregate.ts:1053-1072`) with a per-tool streak counter in the existing bounded map. Claim: `failure-runs`. Rule `failure-run` fires when `runs ≥ 1`; level is `act` when the longest run reaches `FAILURE_RUN_ACT_LENGTH` (default 5) or `runs` reaches `FAILURE_RUN_ACT_COUNT` (default 3), else `watch`. The three constants live in `IMPROVEMENT_THRESHOLDS`.
- **Failure / fallback**: tool names outside the safe grammar are hashed by the existing `sanitizeToolName`. Tracker-only runs leave the section null.
- **NFR / security impact**: defaults are `assumed` and are to be revisited after the first ten version 2 reports; they are not measured thresholds.
- **Verification**: unit — `retrospective-aggregate.spec.ts`, `retrospective-improvements.spec.ts`.

### SRS-007: Durations and waits

- **Statement**: The ledger shall report wall time, per-agent active span, idle gaps on the main session and permission ask-to-answer latency.
- **Priority**: Should | **Status**: Draft | **Source**: REQ-005, AC-010, AC-011
- **Behavior**: `wallSeconds` is tree `last − first`; `agents[].activeSeconds` is node `last − first`. An idle gap is a pause between consecutive valid row timestamps of the main session of at least `IDLE_GAP_MIN_SECONDS` (default 600); negative differences are ignored. Latency is the time from the user row carrying a permission request to the assistant row carrying the matching `respond_to_permission` call, joined on the request id the engine already tracks; median and maximum are over timed pairs only. Claims: `coordination-wait` and `approval-friction`.
- **Failure / fallback**: with no timed pair `permissionLatency` is null and reads "not measured", never 0. A node without timestamps has `activeSeconds: null`.
- **NFR / security impact**: timestamps only; the idle-gap default is `assumed`.
- **Verification**: unit — `retrospective-aggregate.spec.ts`, `retrospective-ledger.spec.ts`.

### SRS-008: `record_decision` tool

- **Statement**: The server shall offer `record_decision` on stdio, validate its input against the decision contract and return a fixed receipt.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-006, AC-012, AC-013
- **Behavior**: strict input, defined once in `decision-contract.ts`: `basis` (`rule` | `default-pending-review`), `impact` (`high` | `medium` | `low`), `reversible` (boolean), `label` (1–120 characters after trimming, required under OD-1 Option A), `ruleRef` (`^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,95}$`, present exactly when `basis` is `rule`). Success returns the text `Decision recorded.` and nothing else. The call is counted by the session tracker like any tool call; no argument value is kept by the server. It is not a housekeeping tool, so a recorded decision advances the report checkpoint.
- **Failure / fallback**: invalid input returns an error result naming the offending field names only, never a supplied value.
- **NFR / security impact**: the handler reads no file, writes no file and checks no consent, because it stores nothing. It is absent on HTTP and SSE.
- **Verification**: integration — new `mcp/test/retrospective-decision-tool.spec.ts` over a real stdio server, plus `retrospective-http-transport.spec.ts` for absence.

### SRS-009: Decision events read from session files

- **Statement**: The aggregator shall count a decision when a session file holds a `record_decision` call whose arguments pass the decision contract and whose result is not an error.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-006, AC-014, AC-015
- **Behavior**: `server-tools.ts` gains `extractDecisionArgs`, the only function allowed to read an argument body of this server's own tool: the `content` of a `write` to `xd://mcp__agent_skills_standard_record_decision` (at most 4,096 characters), or the argument object of a natively named call. The aggregator validates with the shared schema, holds the call by tool-call id (at most 64 pending), and on its result records the decision with the row timestamp, the node's agent label and a label passed through `redactCommand` then `sanitizeLabel`. Calls are de-duplicated by tool-call id.
- **Failure / fallback**: invalid arguments or an error result add to `rejected`; a call with no result row adds to `unconfirmed`; neither is counted as a decision. Beyond 500 decisions per node, totals keep counting and items are dropped into `itemsOmitted`. Tracker-only runs leave `decisions` null.
- **NFR / security impact**: a restart cannot lose a decision because the server holds none. A worker's decisions are counted only when its session is linked. Hosts without a session reader are not counted. Both limits are printed in the report.
- **Verification**: unit and integration — `retrospective-aggregate.spec.ts`, new `mcp/test/retrospective-decisions.spec.ts` with a main and a linked worker fixture and a secret-shaped label.

### SRS-010: Decision reporting

- **Statement**: The ledger, the two session views and the index shall report recorded decisions, labelled agent-declared and unverified.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-007, AC-016, AC-017, AC-018, AC-019
- **Behavior**: claim `decisions` carries the totals of the `decisions` section. Rule `decision-review-backlog` fires when `defaultPendingReview ≥ 1`; level is `act` when a high-impact one exists, else `watch`. `summary.md` gains one Scorecards row with counts only. `report.html` gains `sec-decisions`: the basis-by-impact table, cited rule identifiers with counts, and pending items ordered by impact then time, at most 50 rendered. The section opens by default when a high-impact pending decision exists. The index shows the pending high-impact count per row and window totals. Items in the ledger are ordered pending first, then impact, then time.
- **Failure / fallback**: a measured session with none reads "none recorded; unrecorded decisions are not counted". A null section or a version 1 ledger reads "not measured". Unknown rule ids already fall back safely in the index (`index-report.ts:875`).
- **NFR / security impact**: labels appear only in `ledger.json` and `report.html`, always HTML-escaped. They never appear in `summary.md`, the index or any tool response.
- **Verification**: unit — `retrospective-ledger.spec.ts`, `retrospective-improvements.spec.ts`, `retrospective-views.spec.ts`, `retrospective-report-html.spec.ts`, `retrospective-index.spec.ts`.

### SRS-011: Verification of new ledger sections

- **Statement**: `verifyLedger` and `checkClaimRules` shall reject a version 2 ledger whose new sections disagree with the recomputed input or carry an unsafe value.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-001, REQ-007, AC-016
- **Behavior**: each new section and claim is recomputed from `LedgerInput` and compared (`NUMBER_MISMATCH`). A label longer than 120 characters or holding a control character, a backtick or an angle bracket, a `ruleRef` or stop reason outside its grammar, or an unknown rule or destination id yields `UNSAFE_VALUE`.
- **Failure / fallback**: a failed check ends the run with `LEDGER_INVALID`; nothing is published.
- **NFR / security impact**: this is the last gate before agent-written text reaches disk.
- **Verification**: unit — `retrospective-ledger.spec.ts`, and `retrospective-run.spec.ts` through the existing `tamperLedger` seam.

### SRS-012: Recording guidance

- **Statement**: Guidance shall reach every agent that can call the tool, at a fixed small token cost, and shall be proven by evaluation.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-008, AC-020
- **Behavior**: the tool description carries the definition of a decision and the basis and impact rubric in at most 150 words; it is the always-present guidance, including for sub-agents. The server instructions (`server.ts:85-150`) gain at most three lines. The generated `AGENTS.md` tool table (`IndexGeneratorServiceImpl.ts`) gains one row. The full rubric with worked examples lives once in `skills/common/common-decision-discipline/references/decision-record.md`, loaded on demand, with a one-line pointer in that skill. Cases are added to that skill's `evals/evals.json`: an uncovered consequential choice, a named-rule choice, and an explicit instruction that must not be recorded.
- **Failure / fallback**: installed copies under `.agents/`, `.claude/` and `.codex/` are regenerated by existing tooling, never edited by hand.
- **NFR / security impact**: the evaluation measures what an agent says it would record, not live tool calls. Live adoption is the PRD's secondary metric.
- **Verification**: evaluation — the repository skill-evaluation run for `common-decision-discipline`, with and without the guidance, model and tools fixed, failures kept.

### SRS-013: Privacy and documentation parity

- **Statement**: Documentation shall list exactly what the engine reads and collects after this change.
- **Priority**: Must | **Status**: Draft | **Source**: REQ-010, AC-022, AC-023
- **Behavior**: `docs/session-retrospective-privacy.md` gains rows for the four agent-record fields, the `record_decision` arguments, the `attribution` and `steering` flags, result order and row timestamps; states consent version 5; and its "What is collected" list (lines 183-189) is rewritten to match the ledger, removing typed outcomes and retry and verification result codes, which the engine does not collect. `docs/session-retrospective-hosts.md` replaces the Paseo linkage limit. `docs/session-retrospective.md` and `local-preparation.md` describe the new sections and the tool. The header comment of `server-tools.ts`, which says no argument body ever leaves the module, is corrected for the decision exception.
- **Failure / fallback**: a collection claim the engine cannot meet is removed, not softened.
- **NFR / security impact**: end-to-end check on synthetic sessions and a synthetic store only: zero model calls, zero outbound requests, owner-only files, no script or external URL in either page, no label or agent-record path in any tool response.
- **Verification**: doc parity review, plus integration — `retrospective-tool.spec.ts` and a browser open of the synthetic `index.html` and `report.html`.

## Security Controls, Human Gate And Failure Analysis

| Threat | Control | Card |
| --- | --- | --- |
| A forged agent record points at another session | The file must lie in a consented source root, match by name exactly once, and carry the expected session id itself | SRS-004 |
| A record is swapped for a link or a huge file | No-follow open, checks on the open descriptor, size bound | SRS-004 |
| A parent cycle or a flood of records | Visited set, depth, record and descendant bounds; truncation is reported | SRS-004 |
| Other fields of an agent record leak | Four-field allowlist; nothing else survives the reader | SRS-004 |
| Hostile text in a decision label | Length bound, redaction, sanitizing, ledger verification, HTML escaping, existing CSP, never returned to an agent | SRS-009, SRS-010, SRS-011 |
| A secret in a label | Best-effort redaction; disclosed in consent text | SRS-003, SRS-009 |
| An agent floods or games decisions | Per-node cap; cited rule identifiers shown; every figure labelled unverified | SRS-009, SRS-010 |
| The tool becomes a channel or a write path | Fixed receipt, no echo, no file access | SRS-008 |
| Consent is bypassed | Agent records are read only under a version 5 record; consent re-checked before first read | SRS-003 |

**Human gate:** operator design approval and execution-mode selection are recorded above. Slices 3 and 4 still need independent security review; any merge remains operator-authorized only.

## Migration And Rollback

- No stored data is migrated. Version 1 and version 2 generations coexist.
- Upgrade: every machine's consent reads disabled until a human runs `ags retrospective enable` again. A session whose checkpoint was already published keeps its version 1 report until it has new substantive activity.
- Rollback to an older build: version 2 ledgers are counted unreadable in the index, a version 5 consent record reads disabled as `invalid`, and a human re-enables. Nothing is deleted.

## Blockers And References

- **Blockers**: DD-1 and DD-2 resolved. Runtime and provider failures are recorded in the execution receipt, not treated as plan approval.
- **Run record**: `docs/srs/retrospective-diagnostic-signals-implementation.md`; per-slice receipts under `artifacts/runs/retrospective-diagnostic-signals/`.
- **References**: [PRD](../prd/prd-retrospective-diagnostic-signals.md), [ADR](adr-retrospective-diagnostic-signals.md), [walkthrough](srs-walkthrough-retrospective-diagnostic-signals.md), `docs/session-retrospective-privacy.md`.

## Status And Receipt

- `feature_status`: `approved_for_implementation`; source and acceptance verification pending.

## Next Workflow

`implement-feature`, Subagent-Driven; verification and independent review remain required before completion.

## Approved Recovery Measurement Clarifications

The operator authorized a fresh standard delivery context for the remaining review findings and compile errors. These clarify the unreleased version-2 contract; they do not authorize native production integration.

- Failure-run extraction retains bounded, separate per-tool state. Add `failureRuns.truncated: boolean` to measured version-2 failure data. A node or roll-up cap sets it true and propagates a partial-measurement warning; reported runs and longest streak are then observed lower bounds. Do not merge unrelated overflow tools into a synthetic streak or mark file/tree coverage partial solely for a signal cap.
- `time.main` is nullable independently of `time.wallSeconds`. Worker timestamps can establish tree wall time but cannot establish main-session idle measurements. Unknown main timing renders not measured, never zero.
- Decision window totals disclose measured/unmeasured session coverage. All-unmeasured windows render not measured; mixed windows identify the measured subset. Rule-reference counters treat valid identifiers such as `constructor` as data, not inherited properties.
- A nullable activity rate stays null in the structured ledger. Scalar-only claim facts omit an unavailable rate rather than substituting zero or widening facts to arbitrary nullable objects.
- Migrate the current candidate producer, strict version-2 reader, consumers and contract fixtures together. Preserve supported version-1 readability and frozen stored bytes; do not migrate or rewrite stored data.
