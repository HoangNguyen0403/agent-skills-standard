# Task 8 report — integrated docs, exports, recovery and acceptance trace

Status: **FINAL_DOCS_SETTLED_APPROVED** — Task 8 source+quality review approved
on `review-ee2a93e157bd-b98add47d328`; both force boundaries and the
`exitCode = 1` terminal behavior are closed. Repository implementation is
verified; native-host qualification and matched trials remain separately gated.
No human approval is recorded.

Owner: integration/release owner (Task 8). Project/domain:
agent-skills-standard / Personal. Workspace:
`/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/flawless-mule`.
Baseline (rollback) commit: `a2228857e4cf5b8ee2d71d96630c586618ec2edd`.

No commits, staging, builds, tests, linters or formatters were run by this
task. Two generator commands were run (below).

## Generator commands and actual diagnostics

### Run 1 — before the preservation fix (cause of the incident)

`rtk pnpm generate-indices` produced:

```text
✅ Generated indices for 26 frameworks in skills/index.json
✅ Generated _INDEX.md for 26 categories
✅ Updated AGENTS.md in repo root (Router-style)
✅ Updated agent rule files for: copilot, antigravity, codex, claude
✅ Updated skills/README.md with auto-generated index
  ✅ Generated _INDEX.md for 6 categories.
  ✅ AGENTS.md router index updated.
  ✅ server/AGENTS.md router index updated.
  ✅ 33 workflows synced to .github/prompts/ (GitHub Copilot)
  ✅ 33 workflows synced to .codex/skills/ (Codex)
  ✅ 33 workflows synced to .claude/commands/ (Claude Code)
✅ Synced 33 local workflows to target agent folders
  - Migrated and cleaned up old .agent folder.
  - Updated .github/skills/ (GitHub Copilot)
  - Updated .agents/skills/ (Antigravity)
  - Updated .codex/skills/ (Codex)
  - Updated .claude/skills/ (Claude Code)
✅ Synced 88 local skills to target agent folders
  ✅ Generated _INDEX.md for 6 categories.
  ✅ AGENTS.md router index updated.
  ✅ server/AGENTS.md router index updated.
  ✅ 21 specialists synced to .github/agents/ (GitHub Copilot)
  ✅ 21 specialists synced to .codex/agents/ (Codex)
  ✅ 21 specialists synced to .claude/agents/ (Claude Code)
✅ Synced specialists for: copilot, antigravity, codex, claude
Wall time: 1.85 seconds
```

`Migrated and cleaned up old .agent folder.` came from
`SyncService.cleanupOldFolders()` (`cli/src/services/SyncService.ts:883-903`),
reached from `writeSkills()` (`:549`). It copied `.agent/` into `.agents/` with
`overwrite: false` and then deleted `.agent/`, moving every SDD artifact.
No other generator error was reported.

### Run 2 — after the preservation fix

`rtk pnpm generate-indices` produced the same lines except:

```text
  - Migrated legacy .agent entries; kept active .agent/sdd workspace.
```

`rtk pnpm docs:capabilities` → `✅ Wrote docs/agent-capabilities.md`.
No export, transform or ownership error appeared in either run.

### Run 3 — stale-wrapper correction

The parent full CLI gate then reported **1331 PASS, 1 FAIL**: checked-in wrapper
parity for `implement-feature` (expected new canonical, received old). Cause:
the committed wrappers had no `.skills-lock.json` ownership entries, so
`beginInstall(config, { force: [] })` classified them as unowned/edited and
preserved them while the generator still printed success.

`scripts/generate-indices.ts` now passes an explicit `force` list derived from
the selected canonical workflow names and each configured agent's declared
`workflowPath`/`workflowFormat` (`command`, `toml`, `prompt`, `skill`, `native`).
Only deterministic export paths are forced; canonical authoring sources and
user-authored files are never listed, and the ownership writer backs up first.

Run 3 printed the same export counts and
`Migrated legacy .agent entries; kept active .agent/sdd workspace.` with no
error. The six affected wrappers (`implement-feature`, `review-ticket` for
Copilot, Codex and Claude) changed on disk; stale bytes are preserved in
`.ags/backups/20261023-060813/`. The parent's final full CLI suite then passed
1332/1332 across 66 files, including wrapper parity. The failure is recorded,
not relabeled as passing, in `gate-failures.md`.

### Corrective round 1 — narrowed force boundary (review CHANGES_REQUESTED)

Review approved the mirror refresh but rejected the force boundary as too broad.
Settled source change in `scripts/generate-indices.ts` (no checks run after the
edit):

1. The generator now refuses to run unless the invocation CWD realpath equals
   the authoring repository root (`__dirname/..`) realpath. The rejection happens
   before any index or filesystem write, so a consumer project cannot have its
   `.skillsrc` read or its tree forced.
2. Force candidates are filtered against the selected canonical workflow
   destinations, and nothing under `.agents/workflows/` is ever forced. That
   covers the Antigravity/Kiro `native` destination, which resolves to the same
   canonical path. A native export whose bytes already equal the canonical body
   needs no write; excluding it is an authorization boundary, not a data-loss
   fix.
3. Selected configured mirror paths remain forced with ownership backups; custom
   overrides still short-circuit as before.

Footer follow-up (separate owner): `generate().catch(console.error)` was replaced
by a typed rejection callback that logs the error and sets
`process.exitCode = 1` without calling `process.exit`
(`task-8-correction-report.md`).

Observed results after that follow-up:

- Foreign-CWD smoke: **PASS** — exit `1` with
  `generate-indices must run from the authoring repository root …`, plus
  `consumerUnchanged: true` and `watchedAuthoringFilesUnchanged: true`
  (`generator-boundary-smoke-receipt.json`).
- Normal `pnpm generate-indices`: PASS (26 frameworks, 33 workflows, 88 skills,
  21 specialists across configured surfaces; `Migrated legacy .agent entries;
  kept active .agent/sdd workspace.`).
- `WorkflowTransformer` 43 PASS and `docs:capabilities:check` PASS after the
  guard.
- Real-repository managed lookup: `managed`, `nativeParity: true`, digest
  `96b71bb86d234d36fffb662f3ac1b8ce3e8c7f1d9294e0731cd131bd668911cc`
  (`installed-workflow-smoke-receipt.json`) — managed file parity, not native
  host execution.

No further source or generator changes are made by this task.

## Evidence recovery (AC-6.d)

Non-destructive restore from `.agents/sdd/provider-neutral-delegation` into
`.agent/sdd/provider-neutral-delegation`: copy missing only, reuse identical
bytes, keep differing bytes and report. Result
(`evidence-recovery-receipt.json`, sha256
`eaa3eca196e023e48a3788f3a0481d372e89c59242e1d4b7b45ad8eebee4b61f`):

- copied 51, identical reused 2, conflicts 2.
- Conflicts (both retained; no overwrite):
  - `task-4-report.md` — plural `e33636d9e595f1222d3dcbdf8f7a703e02a94d8696e6aca5528343b98654dc4e` (full pre-move report) vs `.agent` `11fc0f51bd9482d474f2fce9b3e1ee7bd40429af11e1aefa26b7845ca87eba1a` (shorter post-move corrective).
  - `task-5-report.md` — plural `afc308ef9ce54c09dc2617b3e4772be03f428c13c857d3a4750c408450998b67` vs `.agent` `ca46f30f5fadf8e30764055bf483643083ecbfd27ead1af57069aebefff2dadf`.
- Preservation smoke after regeneration: `shasum -a 256 -c` passed for
  `task-2-3b277f2a0616.md` (`3b277f2a0616…`) and the recovery receipt; the
  provider directory still holds 59 files; no root `.agent` migration diagnostic
  appeared. Only the scoped `kept active .agent/sdd workspace` line was printed.

## Durable archive

`artifacts/provider-neutral-delegation/evidence/` (tracked) holds final reports,
receipts, the recovery receipt, the newest required immutable review packages
(`4281f85d59bc-32bdce272c8e` latest Task 5, `4281f85d59bc-2e66…` earlier, `357850ad9e73…`
Task 7, `e8215c575a24…` latest available Task 4) and `MANIFEST.json` with a
SHA-256 for every artifact and its source. `task-4-report.full.md` /
`task-5-report.full.md` preserve the pre-move full reports;
`task-4-report.post-move.md` / `task-5-report.post-move.md` preserve the
post-move correctives. Historical ignored copies under `.agent/sdd` and
`.agents/sdd` remain intact and are not the handoff reference.

## Authored paths (final)

| Path | Change |
| --- | --- |
| `ARCHITECTURE.md` | Request-scoped complete-body delivery and ledger fields; five native delegation surface ids incl. `opencode-agents`; support scoped to host/surface/version/revision/operation plus required controls; Gemini native `tools` projection incl. explicit empty list; OpenCode/Codex disclosure behavior; installed workflow catalog with `workflowCatalog`, `nativeConflicts`, alias-path single write, uninstall retention; §3.3 packets/lifecycle/economics; no-omission rule; ADR-018. |
| `CONTRIBUTING.md` | Consumer-behavior vs incidental snapshot guidance; delivery-evidence/routing metadata rules; catalog ownership incl. conflicts; `docs:capabilities:check` and packet-helper gates; `check-alignment` is lexical. |
| `README.md` | Copilot `.github/agents/<name>.agent.md` + `not_verified` status; projected-controls summary for Copilot/Claude/Gemini/Codex/OpenCode; catalog + conflict + lookup semantics; per-request MCP delivery claim. |
| `CHANGELOG.md` | Unreleased Added/Changed/Fixed/Breaking for D1–D5 incl. `force_reload`, `--assignment`, Copilot path/format, OpenCode/Gemini projection, capability evidence scope, `nativeConflicts`, regenerated exports; unverified-native caveat. |
| `docs/srs/srs-walkthrough-provider-neutral-delegation.md` | REQ-1–REQ-10 trace with observed receipts, the AC-6.d migration/recovery record, evidence limits, durable-archive links, outstanding work. |
| `scripts/generate-indices.ts` | (a) runs only when the invocation CWD realpath equals the authoring repository root, rejected before any write; (b) forces only deterministic mirror paths derived from canonical workflow names × configured agent `workflowPath`/`workflowFormat`; (c) never forces `.agents/workflows/**`, so the canonical catalog and the Antigravity/Kiro native destination stay authored source; ownership backups still apply. |
| `cli/src/services/__tests__/capabilityGolden.spec.ts` + snapshot | Removed the incidental agent-definition pin (old Copilot `agentPath`); retained consumer-visible MCP-target and hook-write snapshots with renamed keys. |

## Acceptance trace summary

- Observed and independently approved: REQ-1 (delivery), REQ-2 (packet), REQ-3
  and REQ-5 (repository contracts; native unavailable), REQ-6 (AC-6.d recovery),
  REQ-7 (46 harness cases; 89 evals / 236 MCP), REQ-8 (139 CLI + 18 uninstall),
  REQ-10 (routing 73/73).
- Observed with correction: REQ-9 (stale wrapper found by the parent gate,
  generator force-list fixed, six wrappers regenerated with backups; full CLI
  1332/1332 including wrapper parity before the boundary corrective). The force
  boundary is now authoring-root-only and excludes canonical `.agents/workflows`
  destinations; that revision is unverified pending the parent checks.
- Unavailable: native qualification, two-host receipts, matched trials, savings.

## Final gate results

- PASS: full CLI **1332/1332 across 66 files**, including checked-in
  `WorkflowTransformer` wrapper parity after run 3; CLI and MCP lint; CLI build;
  MCP bundle; full MCP 236; MCP strict type check; MCP `format:check` (after 4
  test formatter fixes); `docs:capabilities:check`.
- PASS: `check-alignment` at the 70% threshold with 3 existing warnings
  (87/86/83); lexical alignment only, not runtime or export parity.
- Not clean, not claimed: whole-CLI strict type checking fails in 16 existing,
  unrelated construct diagnostics (commands `Mcp`/`Uninstall`/`Upgrade`/`Verify`,
  `HookService`/`GitService` dynamic imports, `ConfigService` cast, `SyncService`
  `Promise.withResolvers`/`withMetadata`, interop rule arity). This is not a
  claim that the baseline compiler was reproduced: the 7 untouched files have an
  empty `git diff` against BASE, and the `SyncService` constructs were also
  read-confirmed on BASE. All diagnostics introduced by this change set were
  fixed. CLI format keeps 2 existing warnings in `IndexGeneratorService.spec`
  and `OwnershipWriter.spec` (empty BASE diff), deliberately not restyled.

A real-repository managed workflow lookup returned `managed` with
`nativeParity: true` and digest
`96b71bb86d234d36fffb662f3ac1b8ce3e8c7f1d9294e0731cd131bd668911cc`
(`installed-workflow-smoke-receipt.json`) — managed file parity, not native host
execution.

## Final observations

- Task 8 approved on `review-ee2a93e157bd-b98add47d328`. No human approval is
  recorded; relayed verdicts are textual evidence only.
- Normal generation left the selected packet (`3b277f2a…66bc`) and recovery
  receipt (`eaa3eca1…4b61f`) byte-identical.
- Session audit/cost receipt (`session-audit-cost.json`): compliance audit
  performed (27 loaded skills; generic Next.js/React warnings not applicable),
  cost and savings `unavailable` for missing actor/attempt usage and rates;
  connected-process pre-change omission/dedup text excluded; no activation.
- Limits retained: 16 existing unrelated whole-CLI type constructs; 2 existing
  CLI format warnings in untouched specs; lexical-only `check-alignment`.
- Legacy edited `.github/copilot-agents/` residue is preserved and disclosed, not
  certified as runtime behavior.

## Remaining work

1. Native-host qualification and matched repeated trials (separately
   authorized; missing usage withholds savings).
2. Maintainer release/activation decision. Repository publication is not host
   activation.
3. Legacy `.github/copilot-agents/` disposition if the maintainer wants it
   removed; nothing is deleted automatically.

## Recommended focused/full gates

`python3 scripts/skill-tests/common-subagent-driven-development/test_task_brief.py`
(plus review-package/progress), focused MCP suites including
`test/skill-delivery.spec.ts`, `test/WorkflowIndex.spec.ts`,
`test/SessionJournal.spec.ts`, focused CLI catalog/capability/specialist/sync
suites including the edited `capabilityGolden.spec.ts`, then `pnpm docs:capabilities:check`
and `pnpm check-alignment` (lexical only).
