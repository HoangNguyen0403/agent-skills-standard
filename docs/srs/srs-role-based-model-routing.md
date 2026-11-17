# Technical Design (SRS/FRS): Role-Based Model Routing — Slice 1, Dispatch Observations

slug: role-based-model-routing
operator_profile: technical
lane: direction
snc_tier: high
model_tier: strong
delivery_mode: extended
plan_approval: approved(requesting maintainer, 2026-11-17)
design_approval: approved(requesting maintainer, 2026-11-17)
repository_status: design_approved
activation_status: not_required
Owner: requesting maintainer; independent validation: separate reviewer per feature slice

## Decision Brief

- **Changes since approved revision:** This design settles the PRD's open decisions.
  - **D1, storage:** a separate, dispatch-scoped event family in the existing delivery observation file. Existing kinds are not touched.
  - **D2, telemetry:** an importer in the MCP package. It shares `SessionJournal`'s bounded parsing and adds a turn-level orchestrator reader.
  - **D3, producer:** a recording helper bundled with the delegation skill, with a lock that the importer also uses.
- **Revision 2:** answers an independent review (8 findings). The main change: dispatch observations no longer reuse `submission`, `correction` or `acceptance`. Reusing them collided with change-level identities and leaked into existing indicators.
- **Recommendation:** Each choice extends a surface that already exists. No new store, service or host parser family.
- **Impact if wrong:** Rework of one event family and one importer. No consumer depends on them yet, so there is no migration.
- **Evidence and limitations:** Existing surfaces were read in this checkout at `9eae81cdb`. Whether the importer reproduces the brief's local figures is unverified until FS-3 runs.
- **Unresolved decision:** None blocks readiness. Lock timeout values are a builder decision; they must be bounded and configurable.
- **Approval:** Granted 2026-11-17 for this design and ADR-023, routed to `implementation-readiness`. It grants no implementation, host configuration change or spend.
- **Independently ready slices:** P-1 and FS-1.

## Trace Source

- PRD: `docs/prd/prd-role-based-model-routing.md` at `9eae81cdb`, approved 2026-11-17.
- Brief: `docs/brd/brd-role-based-model-routing.md` at `14ccf8faf`, approved 2026-11-16.
- Source IDs: REQ-001 to REQ-011; AC-001 to AC-015.

## Architecture And Contract Delta

| Component | Today | Delta | Owner |
| --- | --- | --- | --- |
| CMP-1 Delivery observation contract (`scripts/metrics/types.ts`, `delivery.ts`) | 8 event kinds keyed by change and revision | +7 dispatch-scoped kinds: `dispatch`, `dispatch-round`, `dispatch-verdict`, `dispatch-acceptance`, `dispatch-end`, `dispatch-usage`, `dispatch-inventory`. The 8 existing kinds, their identities and cross-event checks are unchanged. `schema_version` stays 1. | Maintainer (metrics) |
| CMP-2 Metrics report (`report.ts`, `index.ts`) | Delivery health and stage rows | A "Dispatch outcomes" section that reads only dispatch-scoped kinds | Maintainer (metrics) |
| CMP-3 Recording helper (new, `skills/common/common-subagent-driven-development/scripts/record_dispatch.py`) | Nothing records per dispatch | Appends validated dispatch-scoped events and coverage under the shared lock | Maintainer (skills) |
| CMP-4 Telemetry importer (new, `mcp/src/services/DispatchUsage.ts` plus a CLI) | `SessionJournal` aggregates usage per session group from an explicit manifest | Worker usage through `SessionJournal`. Supervision through a new turn-level `OrchestratorTrace` reader that shares `SessionJournal`'s bounded line reader and header checks. Writes `dispatch-usage` under the shared lock. | Maintainer (mcp) |
| CMP-5 Protocol document | Deleted in #279; still cited | Restored with a current status section | Maintainer (docs) |

**Dependency direction:**

- CMP-3 and CMP-4 write CMP-1's format.
- CMP-2 reads CMP-1 only.
- CMP-4 depends on exported helpers of `SessionJournal`, never on `scripts/metrics`.

**Isolation invariant:** no existing indicator reads a dispatch-scoped kind, and no dispatch metric reads an existing kind. A regression test compares legacy indicator output for a fixture before and after dispatch activity is added (VER-6).

**Referential invariant (every dispatch-scoped kind except `dispatch` and `dispatch-inventory`):** the event names a `dispatch_id` that exists as a `dispatch` event, its `change_id` equals that dispatch's `change_id`, and it is observed at or after the dispatch. `dispatch-end` is also observed at or after the dispatch's last round, so a dispatch with no rounds still cannot end before it began. A violation rejects the file. Fixtures cover orphan events, change mismatches and an end before the dispatch.

## Decisions

### D1 Storage: a dispatch-scoped event family in the existing file (chosen)

- **Rejected:** a separate file. It would be a second store, which `progress-receipts.md` forbids, and it would duplicate the coverage and window logic in `delivery.ts`.
- **Rejected:** adding `dispatch_id` to `submission`, `correction` and `acceptance` (revision 1).
  - `submission` identity is `change_id|attempt`, so two workers on one change collide.
  - `acceptance` must match a submission on change, attempt and revision.
  - Existing indicators consume every event of those kinds, so worker activity would distort change-level rounds and the accepted-change cohort.
- **Linkage:** separate kinds keep the two cohorts independent. The only link is `dispatch.change_id`, which names the change a worker served.

### D2 Telemetry: an MCP-package importer (chosen)

- **Rejected:** porting the local Python script into `scripts/metrics`. That would add a second OMP transcript parser.
- **Worker usage:** comes from `collectSessionJournal`, which already provides per-session aggregates, coverage and recorded cost.
- **Supervision attribution:** needs per-turn timestamps, tool targets and notifications, which `SessionJournal` does not return. A new `OrchestratorTrace` reader in the same package provides them. It reuses the exported `boundedLines` reader and native header validation, so there is one bounded parser, not two.
- **Host-specific code:** reading Paseo agent records and Paseo notifications sits behind one `HostAdapter` interface. A host without an adapter reports usage unavailable.

### D3 Producer: a skill-bundled helper (chosen)

- **Rejected:** an MCP tool that writes project files. It would be the server's first write path into consumer repositories.
- **Rejected:** new `sdd_progress.py` fields, which its contract forbids.
- **Validation:** the TypeScript reader stays the authoritative validator. A parity test bounds drift.

## Technical Requirements

### SRS-001: Dispatch event

- **Statement:** `dispatch` records one delegated worker. Must; Draft.
- **Source:** REQ-001; AC-001, AC-002.
- **Fields** (beyond `EventBase`):
  - `dispatch_id`: the host agent id where one exists.
  - `role`.
  - `capability_hint`: `fast | standard | strong | unknown`.
  - `actual`: `{provider, model, effort}`, each a reference string or `"unknown"`.
  - `authority_ref`.
  - `orchestrator_model`: a reference string or `"unknown"`.
  - `orchestrator_ref`: the orchestrator's host session id as a reference string, or `"unknown"`. It links the dispatch to inventory checks (SRS-008).
- **Identity:** `dispatch|<dispatch_id>`.
- **Failure:** a missing field, or a conflicting replay, rejects the file with the field named.
- **Security:** every free string in this and later kinds is a reference string (SRS-010).
- **Verification:** unit — AC-001 and AC-002 cases.

### SRS-002: Rounds

- **Statement:** `dispatch-round` records one worker submission. Must.
- **Source:** REQ-002, REQ-003; AC-003, AC-004.
- **Fields:** `dispatch_id`, `round` (positive integer).
- **Identity:** `dispatch-round|<dispatch_id>|<round>`.
- **Invariants** (each violation rejects the file):
  - The referenced `dispatch` exists, and the round's `change_id` equals the dispatch's.
  - Rounds of one dispatch are numbered 1..n with no gaps.
  - Round k is observed strictly after round k−1 and not before the dispatch.
  - No round is observed after the dispatch's `dispatch-end`.
- **Behavior:**
  - Rounds per dispatch is n.
  - A corrective follow-up is not a separate kind. It is the gap between a `changes_requested` verdict on round k and round k+1.
  - Two workers on one change each have their own round 1, so there is no collision.
- **Verification:** unit — AC-003, AC-004; two parallel dispatches on one change; gap, order and post-end violations.

### SRS-003: Verdict event

- **Statement:** `dispatch-verdict` records a reviewer decision. Must.
- **Source:** REQ-004; AC-005.
- **Fields:** `dispatch_id`, `round`, `verdict` (`approved | changes_requested`), `reviewer_ref`.
- **Identity:** `dispatch-verdict|<dispatch_id>|<round>|<reviewer_ref>`.
- **Invariants:** the referenced round exists, and the verdict is observed at or after that round.
- **Behavior:** a verdict never sets acceptance.
- **Verification:** unit — AC-005; verdict before its round; verdict on a missing round.

### SRS-004: Dispatch acceptance

- **Statement:** `dispatch-acceptance` records an authorized decision on one dispatch's output. Must.
- **Source:** REQ-004, REQ-005; AC-005, AC-006, AC-007.
- **Fields:** `dispatch_id`, `round`, `decision` (`accepted | rejected`), `authority_ref`.
- **Identity:** `dispatch-acceptance|<dispatch_id>`, so there is at most one per dispatch.
- **Invariants:** the referenced round exists and is the dispatch's last round, and the acceptance is observed at or after it.
- **Change-level acceptance:** the existing `acceptance` kind never attributes to dispatches. A dispatch without `dispatch-acceptance` has acceptance `unknown`. This satisfies AC-007 by construction.
- **Verification:** unit — AC-005, AC-006 (missing `authority_ref`), AC-007 (two dispatches on one change, change-level acceptance only, both `unknown`).

### SRS-005: Terminal state and permitted combinations

- **Statement:** `dispatch-end` records `state` (`completed | cancelled | failed | errored`), once per dispatch. Must.
- **Source:** REQ-006; AC-008.
- **Identity:** `dispatch-end|<dispatch_id>`.
- **Permitted combinations:**

| `dispatch-end` | `accepted` | `rejected` | no `dispatch-acceptance` |
| --- | --- | --- | --- |
| `completed` | permitted | permitted | permitted (acceptance `unknown`) |
| `cancelled`, `failed`, `errored` | rejects file | permitted | permitted (acceptance `unknown`) |
| absent (open) | rejects file | rejects file | permitted |

- **Verification:** unit — one case per cell.

### SRS-006: Dispatch outcomes report

- **Statement:** `pnpm metrics:report` renders a "Dispatch outcomes" section. Must.
- **Source:** REQ-007; AC-009, AC-010.
- **Population:** dispatches whose `dispatch` event falls in the report period.
- **Rows:** one per (`role`, `actual.model`), with `unknown` as its own model value.
- **Columns:**
  - `dispatches`.
  - `open`, and terminal-state counts.
  - `ended`: dispatches with `dispatch-end`.
  - `rounds per ended dispatch`: mean, and median when n ≥ 2.
  - `accepted`, `rejected` and `acceptance unknown` counts over ended dispatches.
  - `first-round acceptance share` = ended dispatches accepted at round 1, divided by ended dispatches. Reported as a fraction with both counts, never as a bare percentage.
  - `coverage`: `complete` or `partial` (SRS-008).
  - Usage columns (SRS-007).
- **Behavior:** with no file or no dispatch events, the section is unavailable with a reason, and today's exit codes and `--check` behavior are unchanged.
- **Verification:** integration — fixture roots for AC-009 and AC-010, with expected values computed by hand in the test.

### SRS-007: Usage event and importer

- **Statement:** `dispatch-usage` records estimated usage for one dispatch, actor and window. Should.
- **Source:** REQ-008, REQ-011; AC-011, AC-012, AC-015.
- **Fields:**
  - `dispatch_id`; `actor` (`worker | supervision`); `window_from`, `window_to` (UTC).
  - `turns`.
  - `input_tokens`, `cached_input_tokens`, `cache_write_tokens`, `output_tokens`: each an integer or `null` for unknown.
  - `recorded_cost`: a number or `null`, plus `cost_basis` (`host-recorded-estimate`). The importer copies the host's recorded cost; it never computes a price.
  - `coverage_complete`: a boolean from the journal's coverage and the adapter's resolution.
  - `method_ref`: a fixed identifier of the attribution rule.
- **Identity:** `dispatch-usage|<dispatch_id>|<actor>|<window_from>|<window_to>`.
- **Overlap policy:** a new event whose window overlaps an existing event for the same dispatch and actor, but is not identical to it, rejects the write. An identical replay is a no-op. The report sums non-overlapping windows only.
- **Aggregation:**
  - A column sums only known values and shows a count of unknowns.
  - A row with any `coverage_complete: false` event is labeled partial.
  - Expected usage inventory = every dispatch in the row × {`worker`, `supervision`}. A pair with no covering `dispatch-usage` event counts as unknown, never zero, and makes the row partial. The report shows the measured subtotal next to the count of missing pairs.
- **Importer:** `ags-mcp-dispatch-usage --observations <file> --from <date> --to <date> --host <adapter> [--write]`.
  1. Read `dispatch` events in the window.
  2. For each, the adapter returns the worker transcript path and its expected native session id.
  3. Group dispatches by native workspace. `SessionJournal` requires one workspace per manifest, so the importer builds one manifest per group, with one session per dispatch.
  4. Each manifest session carries its own `expectedSessionId`. `SessionJournal` gains a per-session identity check, and a mismatch is a limitation for that dispatch (SRS-010).
  5. Worker usage comes from `collectSessionJournal`, bounded to the window.
  6. Supervision comes from `OrchestratorTrace`:
     - It streams the orchestrator transcript in order.
     - Entries before `window_from` are replayed only to set the attribution pointer; they are never charged.
     - Each assistant turn inside the window is charged whole to the dispatch it last addressed by agent id, or else to the dispatch whose notification arrived last.
     - A plain user message clears the pointer.
     - A turn with no pointer goes to an `unattributed` total, reported but never assigned.
  7. Dry-run prints the events. `--write` appends them under the shared lock (SRS-009).
- **Failure:** an unknown host, an unresolvable transcript or an identity mismatch still writes a `dispatch-usage` event for that dispatch and actor. It has every counter and `recorded_cost` set to `null`, `coverage_complete: false` and an `unavailable_code` (`no-adapter | unresolved | identity-mismatch`). A limitation names only the dispatch id. A fixture mixes one resolved and one unresolved dispatch in a row and checks that the row is partial with one missing pair per actor.
- **Verification:**
  - integration — MCP fixture suite with an orchestrator transcript, Paseo records and worker transcripts, including a window that cuts through a session (AC-011);
  - unit — no adapter (AC-012); overlap rejection; mixed known and `null` aggregation.

### SRS-008: Coverage

- **Statement:** A dispatch row is `complete` only when every dispatch in it is covered and no inventory conflict applies. A dispatch is covered when its change has a coverage entry with `complete: true`. That entry lists the five recorded kinds (`dispatch`, `dispatch-round`, `dispatch-verdict`, `dispatch-acceptance`, `dispatch-end`) and the dispatch's revision. Its merged intervals (existing `intervalCovered`) must span the dispatch's lifetime: from `dispatch` to `dispatch-end`, or to the period end for an open dispatch. Usage completeness is reported separately (SRS-007). Must.
- **Source:** REQ-002, REQ-007; AC-003, AC-010.
- **Declaring completeness:**
  - Coverage is a declaration by the recorder, not an inference. The helper writes entries with `complete: false` by default.
  - `record_dispatch.py coverage --change <id> --complete` asserts that every dispatch for that change in the interval was recorded.
  - Skipped recording without a declaration therefore shows as partial.
- **Inventory cross-check:** for each orchestrator session in the window, the importer counts host agents it created that have no `dispatch` event.
  - **Persistence:** one `dispatch-inventory` event per change served by that orchestrator in the window. Fields: `orchestrator_ref`, `window_from`, `window_to`, `unrecorded_count`. Identity: `dispatch-inventory|change_id|orchestrator_ref|window_from|window_to`.
  - **Consistency:** every event from one import for one `orchestrator_ref` and window carries the same `unrecorded_count`; a mismatch rejects the file. A new window for an `orchestrator_ref` that overlaps an existing one without being identical is rejected at write, the same overlap rule as SRS-007.
  - **Per-change effect:** a later `metrics:report` makes every dispatch row for a change partial when that change has an overlapping event with `unrecorded_count > 0`, regardless of declared coverage. This propagation is deliberately conservative.
  - **Total:** the section's unrecorded total sums `unrecorded_count` once per unique (`orchestrator_ref`, `window_from`, `window_to`), never once per change.
  - **Verification:** an importer run followed by a separate report invocation on the same file. A two-change fixture with one unrecorded worker reports total `1` and marks both changes partial. An overlapping-window fixture is rejected.
- **Verification:** unit — complete, partial, open-dispatch interval and unrecorded-dispatch cases.

### SRS-009: Recording helper and shared lock

- **Statement:** `record_dispatch.py <kind> --observations <file> [fields]` appends one dispatch-scoped event or coverage entry. Must.
- **Source:** REQ-002 to REQ-006, REQ-009; AC-013.
- **Kinds:** `dispatch`, `round`, `verdict`, `acceptance`, `end`, `coverage`.
- **Transaction:** every writer, both the helper and the importer, uses the same transaction:
  1. Acquire `<file>.lock` by exclusive create, with a bounded wait.
  2. Read the file and validate the new event against it.
  3. Write a temporary file in the same directory and rename it over the original.
  4. Release the lock.

  Failing to acquire the lock within the bound exits 1 and writes nothing. A lock older than a bound is reported, never broken automatically.
- **Behavior:**
  - The event id is derived from its domain identity, so a replay is a no-op and a conflicting replay is an error. Ids join identity parts with `#`, because `|` is not allowed in a reference string (SRS-010). Window timestamps are canonicalized to `Date.toISOString()` form before they enter an id or identity. (Amended during FS-1 review.)
  - The helper creates the file with `schema_version: 1` and `source_kind: operator-recorded` when it is absent.
- **Failure:** exit 2 for usage errors; exit 1 for validation, conflict or lock failure. The file is never partially written.
- **Verification:**
  - unit — `scripts/skill-tests/common-subagent-driven-development/test_record_dispatch.py`, including two interleaved writer processes where both events survive;
  - parity — a `scripts/metrics` test runs the helper into a temporary file, and `readDeliveryObservations` must accept the result with no issues.

### SRS-010: Output boundary and transcript binding

- **Statement:** Every emitted string is either drawn from a closed vocabulary or is a reference string. A reference string matches `^[A-Za-z0-9][A-Za-z0-9._:@#-]{0,127}$`: no `/`, `\`, `~` or whitespace. This covers event fields, `source_ref`, `method_ref`, limitations and error messages. Must.
- **Source:** REQ-011; AC-015.
- **Behavior:**
  - Writers reject non-conforming values before writing.
  - The reader rejects them in dispatch-scoped kinds.
  - Diagnostics name dispatch ids and fixed codes only.
  - Each transcript is bound to its own expected native session id, not merely to membership in an inventory.
- **Verification:** unit — a fixture whose titles, prompts and absolute paths appear in host records produces none of them in output; swapped host records (two dispatches pointing at each other's transcripts) produce two identity limitations and no usage; a path-bearing filesystem error is reported by code.

### SRS-011: Orchestrator guidance

- **Statement:** `common-subagent-driven-development` gains one reference section, linked from the task loop. Should.
- **Source:** REQ-009; AC-013.
- **When to record:**
  - `dispatch`: after a successful dispatch.
  - `round`: on each worker report.
  - `verdict`: on each review result.
  - `acceptance`: only with an authority reference.
  - `end`: on the terminal notification.
  - `coverage --complete`: when the task's dispatch inventory is final.
- **Constraint:** canonical text names semantic operations, never host tools, models or profiles.
- **Verification:** manual — independent review of the changed files, including a search for provider and model identifiers.

### SRS-012: Protocol restoration

- **Statement:** Restore `docs/validation/context-aware-delegation-protocol.md` from `c60b42c11`. Sections 1–7 stay unchanged. Section 8 states current evidence only and drops the deleted `artifacts/context-aware-delegation/final-evidence/` paths. Should.
- **Source:** REQ-010; AC-014.
- **Verification:** manual — a scripted existence check over every path cited by the protocol, `ARCHITECTURE.md` §3.4 and `CONTRIBUTING.md`.

## Extensions

### Interface And Data Contracts

| Kind | Required fields beyond `EventBase` | Domain identity |
| --- | --- | --- |
| `dispatch` | `dispatch_id`, `role`, `capability_hint`, `actual{provider,model,effort}`, `authority_ref`, `orchestrator_model`, `orchestrator_ref` | `dispatch|dispatch_id` |
| `dispatch-round` | `dispatch_id`, `round` | `dispatch-round|dispatch_id|round` |
| `dispatch-verdict` | `dispatch_id`, `round`, `verdict`, `reviewer_ref` | `dispatch-verdict|dispatch_id|round|reviewer_ref` |
| `dispatch-acceptance` | `dispatch_id`, `round`, `decision`, `authority_ref` | `dispatch-acceptance|dispatch_id` |
| `dispatch-end` | `dispatch_id`, `state` | `dispatch-end|dispatch_id` |
| `dispatch-usage` | `dispatch_id`, `actor`, `window_from`, `window_to`, `turns`, token fields, `recorded_cost`, `cost_basis`, `coverage_complete`, `method_ref`; `unavailable_code` when unresolved | `dispatch-usage|dispatch_id|actor|window_from|window_to` |
| `dispatch-inventory` | `orchestrator_ref`, `window_from`, `window_to`, `unrecorded_count` | `dispatch-inventory|change_id|orchestrator_ref|window_from|window_to` |

- **Existing kinds:** unchanged.
- **Retention:** the git-ignored `artifacts/metrics/`, as today.
- **Migration:** none.
- **Ordering:** not significant in the file; chronology is enforced by the invariants above.
- **Shared `SessionJournal` changes:** export `boundedLines` and the native header check, and add an optional per-session `expectedSessionId` to the manifest. Existing manifests keep their current behavior.

### Security Controls And Failure Analysis

| Failure | Effect | Handling |
| --- | --- | --- |
| Orchestrator skips recording | Rows under-count | Coverage stays partial unless declared; the importer reports unrecorded dispatches |
| Helper and reader disagree on validity | File rejected at report time | Parity test; the reader is authoritative |
| Concurrent writers | Lost acknowledged event | Exclusive lock around the whole read, validate and write transaction; interleaved-writer test |
| Stale lock after a crash | Writers blocked | Bounded wait, then exit 1 with the lock age reported; manual removal only |
| Swapped or wrong transcript | Wrong usage attached | Per-session expected native id; mismatch becomes a limitation with no usage |
| Overlapping imports | Double-counted usage | Overlap rejection; identical replay is a no-op |
| Secrets, prompts or paths in telemetry | Leak into output | Reference-string boundary on every emitted string; redaction test |
| Workers in different workspaces | Journal rejects mixed manifests | One manifest per workspace group |

The sensitive-change floor does not apply. No authentication, money movement, secrets or production trust boundary changes, and the importer reads local files the operator owns.

## ADR-023: Dispatch Observations As A Separate Event Family

- **Context:** Routing between models needs per-worker rounds and acceptance. The delivery observation contract records changes, not workers. Reusing change-level kinds collides on identity and distorts existing indicators.
- **Decision:**
  - Add seven dispatch-scoped kinds to the existing observation file and leave the existing kinds untouched.
  - Record them with a skill-bundled helper.
  - Import usage through an MCP-package adapter that shares `SessionJournal`'s bounded parser.
  - All writers use one locked transaction.
- **Consequences:**
  - There is one store, with two independent cohorts linked only by `change_id`.
  - Billed `cost` and estimated `dispatch-usage` stay separate.
  - The MCP server stays read-only toward consumer repositories.
  - The Python helper is a second, partial validator, bounded by a parity test.
- **Status:** Proposed. On approval it is added to `ARCHITECTURE.md`, with §3.3 updated.

## Verification Plan

| VER | Covers | Lane | Command / evidence |
| --- | --- | --- | --- |
| VER-1 | SRS-001 to SRS-005, SRS-008, SRS-010 reader rules | unit | `rtk pnpm test:metrics` |
| VER-2 | SRS-006 | integration | `rtk pnpm test:metrics` fixture-root cases; `rtk pnpm metrics:report --root <fixture>` output reviewed |
| VER-3 | SRS-007, SRS-010 importer rules | integration and unit | `rtk pnpm --filter ./mcp test` new fixture suites; existing `SessionJournal.spec.ts` passes unchanged |
| VER-4 | SRS-009 | unit and parity | `python3 -m unittest` on `test_record_dispatch.py`; parity test in `scripts/metrics` |
| VER-5 | SRS-011, SRS-012 | manual | Independent review; scripted citation existence check |
| VER-6 | Isolation invariant | regression | Legacy indicator output for one fixture is identical before and after dispatch events are added |

## Review History

| Round | Verdict | Disposition |
| --- | --- | --- |
| 1 | CHANGES REQUESTED, 8 findings | 1 identity collision → separate kinds (D1, SRS-002). 2 indicator leakage → isolation invariant and VER-6. 3 lifecycle ambiguity → invariants, SRS-005 table, exact denominator. 4 lost writes → locked transaction (SRS-009). 5 attribution beyond `SessionJournal` → `OrchestratorTrace` (SRS-007). 6 usage identity and completeness → window fields, overlap policy, unknown-preserving aggregation, recorded cost only. 7 privacy and binding → SRS-010. 8 coverage → SRS-008 declaration and inventory cross-check. |
| 2 | CHANGES REQUESTED, 3 remaining findings | 3 lifecycle → referential invariant for all dispatch-scoped kinds, end-after-dispatch rule. 6 missing usage → `dispatch-usage` written on failure with `unavailable_code`, expected inventory per dispatch and actor. 8 inventory effect → persisted `dispatch-inventory` kind that forces affected rows to partial. |
| 3 | CHANGES REQUESTED: findings 3, 6 and 8 resolved; 1 new major | Inventory double-count → one total per unique (`orchestrator_ref`, window), consistent counts across per-change events, overlapping inventory windows rejected, two-change fixture. Applied as prescribed; not re-reviewed. |

## Blockers And References

- No blockers.
- FS-3's live comparison against the brief's figures remains maintainer-local evidence.
- References:
  - `scripts/metrics/delivery.ts:126-160,275-380,441-485,581-598,708-753`
  - `mcp/src/services/SessionJournal.ts:42-86,152,860-900,1186-1250`
  - `skills/common/common-subagent-driven-development/references/progress-receipts.md`
  - `ARCHITECTURE.md` §3.3, ADR-018, ADR-020

## Status And Receipt

- `feature_status`: requirements_ready (design pending approval)
- Run record: none written (`unknown`).

## Next Workflow

`implementation-readiness` for P-1 and FS-1 to FS-3, after design approval.
