# AGS accounting implementation report

## Delivery
- Implementation commit: `978d6ef4fa0b301b8c4e0ea26adbdf05a5410449` (`feat(accounting): add session reports and receipts`). No publish or PR.
- Changed canonical MCP collector/CLI/package/docs/tests: `mcp/src/services/SessionJournal.ts`, `mcp/src/session-journal-cli.ts`, `mcp/test/SessionJournal.spec.ts`, `mcp/package.json`, `mcp/README.md`, `mcp/SESSION_REPORT.md`.
- Changed canonical receipt skill/helper/tests: `skills/common/common-subagent-driven-development/SKILL.md`, `skills/common/common-subagent-driven-development/references/progress-receipts.md`, `skills/common/common-subagent-driven-development/scripts/sdd_progress.py`, `scripts/skill-tests/test_sdd_progress.py`.
- Updated release metadata: `skills/metadata.json`, `CHANGELOG.md`; generated skill copies under `.agents/skills/common/common-subagent-driven-development/`, `.claude/skills/common/common-subagent-driven-development/`, `.codex/skills/common/common-subagent-driven-development/`, and `.github/skills/common/common-subagent-driven-development/` (skill, reference, helper).
- MCP package candidate: `agent-skills-standard-mcp@0.7.0`; `npm pack --json` shasum `07e7a65db8617b4fd24cd2cdd7de7887c9be71c5`. Isolated install: `/tmp/ags-mcp-session-install-0.7.0-final`; installed executable: `/tmp/ags-mcp-session-install-0.7.0-final/node_modules/.bin/ags-mcp-session-report`.

## Behavior and verification
- Collector streams only explicitly selected Codex JSONL / OMP v3 files from a required manifest; validates workspace, inventory and bounds; classifies half-open phase windows and declared actor role/outcome; deduplicates repeated native records; emits grouped token/cache/cost estimates with unknowns preserved and private prompts, paths and native IDs excluded.
- Checkpoint helper emits atomic version-2 revision/evidence-bound progress receipts; rejects stale revision, mismatched dirty identity, invalid plan/evidence bindings and unauthorized completion metadata; tests document that a self-declared pause is not host-enforced approval/wakeup.
- `rtk pnpm --filter ./mcp test`: passed; 11 test files, 159 tests.
- `rtk pnpm --filter ./mcp build`: passed; built CJS/node20 entries.
- `rtk pnpm --filter ./mcp lint:check`: passed.
- `rtk python3 -m unittest discover -s scripts/skill-tests -p test_sdd_progress.py`: 6 passed.
- `rtk pnpm --filter ./cli validate:all`: passed; 324 skills, 0 failures, 44 existing warnings.
- `rtk pnpm audit:sdlc`: passed.
- `rtk pnpm check-alignment`: passed threshold.
- `pnpm calculate-tokens`, `pnpm generate-indices`, and frozen offline install succeeded.
- `npm pack --dry-run --json`, final `npm pack --json`, and isolated install passed. Package contents included `dist/index.js`, `dist/session-journal-cli.js`, `README.md`, and `SESSION_REPORT.md`.
- Installed command was exercised in both human and JSON modes against synthetic Codex/OMP fixtures. Both returned exit 0; output receipts and exact fixtures are retained under ignored local evidence `.superpowers/sdd/ags-accounting-implementation/tmp-evidence/session-report/`. Coverage: 2 selected / 2 expected / 0 missing; Codex delta 40 uncached + 10 cached + 5 output; OMP 100 input + 40 cache-read + 10 cache-write + 20 output + 5 reasoning; only native OMP cost 0.0035 reported. Full captured output is in `cli-json-report.json` and `cli-human-report.txt`; binary/install paths and invocation are in `smoke-notes.md`.

## Constraints and open gates
- No valid pre-implementation RED could be observed: the approved base did not contain the collector, CLI, receipt helper, or their tests. Tests were added for the absent components and exercised after implementation; this is not represented as strict TDD RED/GREEN evidence.
- MCP LSP query reported no language servers configured. No existing callers of the new APIs were present at the approved base to reference-check.
- Root build reports an existing duplicate `pnpm` key in `package.json`; not changed. Early lint caught formatting issues, fixed before the passing final lint gate. An initial isolated binary smoke exposed an npm-symlink entrypoint guard bug; fixed to `require.main === module`, then rebuilt/repacked and reran both installed modes successfully.
- No real or historical Personal/native journal was opened. The installed synthetic smoke is not journal-accounting acceptance: real Personal inventory/source authorization and W7 remain blocked. No independent reviewer ran; review and PR remain pending.

## Corrective pass — settled source

- Correction commit: `ed835999b6e14f9e886851cc8a073a2bda07a8b7` on `feat/native-session-report-checkpoint-receipts`. Candidate remains MCP 0.7.0; package/version metadata, generated mirrors, changelog, dependencies, lockfile, and common receipt component were not changed. Existing package scripts/bin already included the collector CLI.
- F1: OMP `input` and `cacheRead` now validate as independent native buckets; Codex alone enforces cached-input ≤ input.
- F2: malformed present OMP submetrics and Codex `token_count` events with missing/null info increment invalid usage and make coverage incomplete.
- F3: OMP usage requires its native persisted message-row identity; missing identity is not billed.
- F4: decreasing/invalid Codex cumulative records no longer rewind the last valid baseline; A/B/A/B reports one unique delta and incomplete coverage.
- F5: pinned Codex 0.160.0 `TokenUsageInfo` contains no recorded-cost field. Removed unsupported `estimated_cost` / `cost_usd` decoding; Codex recorded cost remains unknown. OMP v18.6.1 `Usage.cost.total` is under `message.usage.cost`; preserve that recorded amount. OMP session entries have no `isDraft` / `finalized` discriminator, so no draft replacement semantics are claimed; usage-less records are incomplete.
- F6: absolute, URI-like, traversal, backslash and multi-segment path-like model metadata becomes `unreported`; privacy regression checks the output itself.
- F7: decoder follows pinned source schemas: Codex `event_msg` / `payload.type=turn_aborted`; OMP assistant `message.stopReason=aborted` and `model_usage.stopReason=aborted`. No shape was inferred from the original probes.
- F8: replaced `readline` full-line allocation with a chunk-based `StringDecoder` reader that drops lines over 1,000,000 characters; replay state is capped at 10,000 IDs per selected journal. It stops accounting at the cap, sets `resourceLimitReached`, and never silently evicts identities. Consumer tests use an oversized newline-free record and 10,001 distinct IDs.
- F9: conflicting finalized OMP test now uses two individually valid records (input=10/output=2/total=12 versus input=10/output=3/total=13); asserts one billed final plus incomplete conflict coverage.
- Provenance: installed executables reported by `which` are OMP v18.6.1 and Codex CLI 0.160.0. Public pinned sources and exact limits are documented in `mcp/SESSION_REPORT.md`; no private journals or binary dumps were inspected.
- RED/GREEN evidence and exact commands are retained in `.superpowers/sdd/ags-accounting-implementation/tmp-evidence/correction/settled/verification.md`. RED: 10 failures / 7 passes, including nine expected behavior failures; the F8 case in that first run was invalid because its fixture omitted the session header (`Native session file is empty.`), so it is not counted as F8 RED. Focused post-fix test: 17/17. Final MCP suite: 11 files / 168 tests; lint and formatting checks passed.
- Settled package build/pack/install: final 0.7.0 tarball SHA-1 `f31420bf3aeacdce9c1c477d2bf742c700360a6c`; included `dist/session-journal-cli.js`. Isolated install added 104 packages. Installed human and JSON modes both exited 0; copied reviewer scenarios verified disjoint buckets, malformed/missing identity incompleteness, cumulative replay, model privacy, both native aborts, unknown Codex cost, and OMP recorded cost.

## Remaining gate

- No authorized real Personal journal or independent actor inventory was supplied or opened. Installed synthetic accounting is not real-journal acceptance; W7 remains externally blocked. Independent review and PR remain pending and were not performed by this implementation owner.

## Correction pass — native usage fidelity (C1–C4)

- Implementation commit: `15b9df464c93b0e9762db44f5108052c60ae163c` (`fix(accounting): preserve native usage buckets`) on `feat/native-session-report-checkpoint-receipts`. Only collector, CLI presentation, MCP tests, MCP docs, and root changelog changed. Candidate stays `agent-skills-standard-mcp@0.7.0`; no dependencies, version, receipt helper, generated mirrors, or historical evidence were changed.
- C1: OMP `model_usage` is a separate `usageKind: "auxiliary"` group; it carries its own usage/cost and native `purpose`/`role`, retains manifest actor role/provenance, and contributes zero transcript messages. Same-ID replay deduplicates; a changed usage signature is invalid/incomplete.
- C2: OMP orchestration input/cache-read/output are separately preserved, each nullable when unreported. They are not combined with conversation buckets or derived from `totalTokens`; changed same-ID orchestration is a conflict.
- C3: Codex `cache_write_input_tokens` is mapped to the existing separate cache-write counter and cumulative delta. Repeated cumulative snapshots add no delta; distinct last-only `token_count` events are not value-deduplicated because the pinned protocol defines no event identity. Unsupported `auxiliary_tokens` decoding/export was removed.
- C4: An oversized record stops accounting in that selected journal, retains prior valid usage, marks malformed/resource-limited/incomplete, and allows later selected journals to proceed. The 10,000-identity cap remains non-evicting and per selected journal.
- Regression sequence: initial focused RED recorded 5 failures / 18 passes for missing C1–C4 behavior; after schema-faithful fixture corrections, focused GREEN passed 24/24. Final `rtk pnpm --filter ./mcp test`: 11 files / 175 tests passed. `rtk pnpm --filter ./mcp build`, `lint:check`, and `format:check` passed. Build emitted the existing duplicate root `pnpm` key warning; not changed.
- Package proof: `npm pack --json` candidate tarball `agent-skills-standard-mcp-0.7.0.tgz`, SHA-1 `a1af6d85df45107ec7c7e7ab83e173226a3ab739`, SRI `sha512-lNdC8iwIWgH67heeq/EnfZJPLCSz7ZXwFHR85/02kFTNqSyxWF0telL0GgadO06Umee2bRrme8gL6oRiE/7b2A==`. Isolated install prefix `/tmp/ags-mcp-c1-c4.rNT9Gp/install` used `npm install --ignore-scripts --no-audit --no-fund`; 104 packages added. Installed CLI exited 0 in both human and JSON modes on a synthetic OMP manifest: distinct auxiliary/conversation groups, exact cache-write and orchestration buckets, independently unknown absent submetrics, and complete coverage. Package hash, source commit, fixture, and exact outputs are retained in `.superpowers/sdd/ags-accounting-implementation/tmp-evidence/correction-final-head/`.
- This synthetic consumer proof does not satisfy real Personal journal acceptance. No real/personal journal or private prompt was accessed. W7 and independent review remain externally blocked/pending.

## Correction pass — invalid deltas and native identity collisions (F10–F12/N1)

- Source commits: `725b6b02f3514c6cdfaaa36c5a665712b6806c7b` (`fix(accounting): reject invalid billing deltas`) and bounded-state refinement `889aa462ef3c77baf4506d37912612e0ac89d5f6` (`fix(accounting): bound native identity tracking`), on `feat/native-session-report-checkpoint-receipts`.
- F10: Codex cumulative derived deltas reject cached input greater than total input before baseline advancement. Regression sequence verifies incomplete coverage/no negative uncached input and recovery from the prior accepted baseline. OMP independent native input/cache-read buckets remain unchanged.
- F11: OMP `purpose` and `role` values colliding with any expected session ID or OMP row identity are redacted across same-row, selected-session, cross-row, and cross-selected-session cases. Valid labels and usage remain; malformed/incomplete native identity scans suppress provenance while retaining counters/cost. Redaction/re-keying runs at each selected-journal boundary; only that journal's non-evicting 10,000-ID map is live, not a retained map collection for all journals.
- F12: optional numeric counters are type-narrowed before numeric checks; removed the obsolete `auxiliary` delta key. No casts were added to bypass strict typing.
- N1: human table label changed to `Transcript messages`; auxiliary usage still contributes zero transcript messages.
- Verification on final source: strict collector/CLI TypeScript command exited 0 with no diagnostics; MCP suite 11 files / 177 tests passed; build, lint, and formatting checks passed. Build retains the existing duplicate root `pnpm` key warning (`package.json:134`).
- Final candidate remains `agent-skills-standard-mcp@0.7.0`; no dependency/version/lockfile change. Fresh pack from final source commit `889aa462ef3c77baf4506d37912612e0ac89d5f6`: SHA-1 `e7a7d237ff55fc2b762daaea039fb4c975648d9e`; SRI `sha512-78nXy35r3vZLiUSUsQsLmskFwuW77GiUl9GAX8JizFoNHgW1TX/pYh9GRMJRriPeQH/sEsArC61vAAZUPIRWCg==`. Installed with `--ignore-scripts`; 104 packages added.
- Final installed CLI synthetic checks passed in JSON and human modes: Codex invalid-delta recovery; OMP collision redaction with valid labels and all five usage rows; human `Transcript messages`; malformed OMP provenance fallback with counters/cost preserved. Exact evidence: `.superpowers/sdd/ags-accounting-implementation/tmp-evidence/correction-follow-up-final/verification.md` and `package.json`. Earlier interim package evidence under `tmp-evidence/correction-follow-up/` is retained, not the final package.
- No real/private journal was opened. W7 real-journal acceptance remains externally blocked; independent re-review remains pending. No publish, push, PR, merge, release, or runtime activation.
