# Integration and Governance Source Preparation — Corrected Safe Plan (v2)

**Date**: 2026-10-24
**Role / Author**: Replacement Integration Worker (bounded; no subdelegation). **Not** Main, **not** the requesting operator.
**Accountable Engineering Owner**: requesting operator (self-assigned "Me"); G2 approved 2026-10-24.
**Task Slug**: `cyber-lab-validation` · **Slice**: Integration & Governance Source Preparation (Slice I)
**Status**: **ISOLATED INTEGRATION EXECUTED; AC-CLV-16 LOCAL CONSUMER SMOKE PASSED FOR 18 EXPORTED RESOURCES.** The source directory contains 19 files; `evals/evals.json` is not exported by the staged CLI's resource filter and was not counted as a consumer package file. Exact outcomes are in `artifacts/runs/cyber-lab-validation/`.
**Supersedes**: v1 of this report (rejected after review; its copy-back allowlist and staging model were wrong). This report's plan sections are retained as design rationale; execution facts below supersede planned wording.
**Preconditions**: parent explicitly settled all C IR01–05 and E ER01–07 and signaled execution. Smoke helper defects discovered in two actual attempts were corrected; both failures and final passing evidence are preserved.

---

## 0. Correction ledger (v1 claim -> verified fact)

| # | v1 claim | Verified fact | Source |
| --- | --- | --- | --- |
| 1 | Generated workflow wrappers live at `.github/workflows/**`, `.claude/workflows/**`, `.codex/prompts/**` | Wrappers are `.claude/commands/<key>.md` (command), `.github/prompts/<key>.prompt.md` (prompt), `.codex/skills/<key>/SKILL.md` (skill), `.agents/workflows/<key>.md` (native, byte-identical to canonical) | `cli/src/services/utils/WorkflowTransformer.ts:72-107`; `cli/src/capabilities/agentCapabilities.ts:158-159,181-182,241-242,283-284`; `cli/src/services/WorkflowSyncService.ts:195-267` |
| 2 | `.github/workflows/**` is a generated mirror surface | `.github/workflows/` is CI configuration (8 tracked files) and is **never** written by the generator. Copying it back would corrupt CI. | `git ls-files .github/workflows`; no generator write path to it in `scripts/generate-indices.ts` |
| 3 | Staging could omit `.agents/` entirely | `.agents/workflows/` is the **canonical** authoring source read by the generator (`localWorkflowsDir`). Omitting it produces an empty workflow set. | `scripts/generate-indices.ts:326-350` |
| 4 | Copy back whole directories (`.github`, `.claude`, `.codex`) | Whole-directory copy-back would overwrite CI config, hand-authored `copilot-instructions.md`, hooks, and mcp configs. Only derived-byte file-level copy-back is acceptable. | this report §4, §7 |
| 5 | Copy back `.skills-lock.json` "if updated" | The lockfile is gitignored and **absent** in this worktree. Copying a generated one back would (a) claim ownership of files that are currently unowned, (b) flip `generate-indices` out of its pre-ownership branch, (c) enable prune authority on later runs. Do **not** copy it back. | `.gitignore:14` (`/.skills-lock.json`); `scripts/generate-indices.ts:305-310`; `cli/src/services/SyncService.ts:148-170` |
| 6 | `calculate-tokens` only updates `skills/metadata.json` | It also rewrites root `README.md` and `cli/README.md` metric tables. | `scripts/calculate-tokens.ts:194-271` |
| 7 | Evidence hashes may be captured now / at plan time | **Not during source churn.** Hashes are captured only at execution time, immediately pre-run, and are invalidated by any later change to a staged source path. | parent instruction 2026-10-24 |
| 8 | Author is "Integration Worker (Main)" | Author is a bounded replacement worker; Main and operator remain distinct. | this brief |
| 9 | `node_modules` can be symlinked from the worktree | This worktree has **no** `node_modules` at root or in `cli/`. Dependencies exist only in the primary checkout. | `ls` of both paths (empty/absent); `git worktree list` |
| 10 | Orphan wrappers are an operator decision | Decided: preserve the three unowned orphan wrappers unchanged on all three surfaces; report them; never delete, never adopt, never add them to a derived allowlist. | parent decision 2026-10-24 (no operator re-approval needed) |
| 11 | `.skillsrc` refs should be reconciled with metadata | Decided: leave active `.skillsrc` refs unchanged. The disposable smoke writes its own consumer config; the repository config is not touched. | same |
| 12 | Lockfile copy-back is "avoid" | Decided: never copy `.skills-lock.json`; no prune authority may reach the active checkout. | same |
| 13 | Dependency reuse as verification environment | **Superseded.** The primary checkout's dependency versions and lock differ from this candidate, so it cannot validate this candidate reproducibly. After source settlement only, use a disposable staging dependency workspace installed from this candidate's exact lockfile with the declared pnpm version and `--frozen-lockfile`; try the local store offline first, fetch only exact missing packages under existing policy if needed. Never mutate active/primary dependencies or update/copy a lockfile. | parent decision 2026-10-24 |
| 14 | Environment choice needs another operator approval loop | Resolved by parent decision: no further operator approval is needed for the disposable, lock-exact staging install after the source-settlement signal. | same |
| 15 | Route to Personal-DeepSeek for integration execution | **Unavailable.** Agent request `87f48364-5ae3-49bb-9791-73e40a30099f` returned observed `402 Insufficient Balance`; no retry or further delegation. Use configured Personal Delivery only for this bounded integration work. | parent handoff 2026-10-24 |

---

Plan and execution record for Slice I. This worker owned the integration report and derived export integration only; no skill/workflow/eval source or generator code was changed. Execution receipts are under `artifacts/runs/cyber-lab-validation/`.

## 2. Verified export identity model (derived, not guessed)

Active agent set is fixed by `.skillsrc` (`agents: copilot, antigravity, codex, claude`) and `resolveTargetAgents` honours config before detection (`cli/src/services/SyncService.ts:679-693`).

| Surface | Claude | Copilot | Codex | Antigravity |
| --- | --- | --- | --- | --- |
| Skills | `.claude/skills/<cat>/<skill>/**` | `.github/skills/<cat>/<skill>/**` | `.codex/skills/<cat>/<skill>/**` | `.agents/skills/<cat>/<skill>/**` |
| Category index | `.claude/skills/<cat>/_INDEX.md` | `.github/skills/<cat>/_INDEX.md` | `.codex/skills/<cat>/_INDEX.md` | `.agents/skills/<cat>/_INDEX.md` |
| Workflow wrapper | `.claude/commands/<key>.md` | `.github/prompts/<key>.prompt.md` | `.codex/skills/<key>/SKILL.md` | `.agents/workflows/<key>.md` (**canonical; exclude**) |
| Specialists | `.claude/agents/*` | `.github/copilot-agents/*` | `.codex/agents/*` | none (`agentPath` unset) |
| Rules | `CLAUDE.md` (append-only) | `.github/instructions/*.instructions.md` | `.codex/rules/*.md` | `.agents/rules/*.md` |
| Hooks | `.claude/hooks/preedit-skill-loader.js`, `.claude/settings.json` | `.github/hooks/*`, `.github/hooks.json` | `.codex/hooks/*`, `.codex/hooks.json` | none |
| MCP | `.mcp.json` | `.github/mcp.json` | `.codex/config.toml` | `.antigravity/mcp_config.json` |
| Root artifacts | `skills/index.json`, `skills/<cat>/_INDEX.md`, `skills/README.md`, `AGENTS.md`, `server/AGENTS.md`, `README.md`, `cli/README.md`, `skills/metadata.json#token_metrics` ||||

Capability citations: `cli/src/capabilities/agentCapabilities.ts:149-171` (Claude), `173-231` (Copilot), `233-273` (Antigravity), `275-303` (Codex).

Workflow wrapper targets: `WorkflowSyncService.writeWorkflows` resolves `path.join(cwd, agentDef.workflowPath)` and, for `skill` format, `<dir>/<key>/SKILL.md` (`cli/src/services/WorkflowSyncService.ts:207-240`). Only keys present in `.skillsrc.workflows` are emitted (`scripts/generate-indices.ts:329-338`). Native format returns the raw canonical bytes (`WorkflowTransformer.ts:96-97`).

Not generated, must never be treated as derived: `.github/workflows/**`, `.agents/workflows/**` (canonical), `.agents/rules/**`, `.github/instructions/**` (static bridge text), `.agent/**` (local evidence), `docs/agent-capabilities.md` (static capability table from `agentCapabilities.ts`, unaffected by adding a skill).

## 3. Generator behaviour that constrains the procedure

1. **`generate-indices` is not an index-only command.** It writes indices, then runs the full local install lifecycle: `beginInstall({dryRun:false, force:[]})` (`scripts/generate-indices.ts:322`), `writeWorkflows` (`:350`), `writeSkills`, `completeInstall({refreshIndices:true})` (`:393`), specialist sync (`:414`), and `AgentBridgeService.bridge` (`:193`). It therefore writes agent mirrors, rules, hooks, mcp configs, and a lockfile.
2. **`.agent` deletion.** `SyncService.writeSkills` calls `cleanupOldFolders()` (`cli/src/services/SyncService.ts:404-410`), which copies `.agent` into `.agents` and then `fs.remove('.agent')` (`:732-754`). `.agent/` holds 12 untracked evidence files (`.agent/sdd/.gitignore` ignores everything under it). Any staging tree containing `.agent` risks evidence loss; exclude it structurally.
3. **Ownership semantics with an empty force list and no prior lock** (`cli/src/services/install/OwnershipWriter.ts:70-119`):
   - destination missing -> written (`added`)
   - bytes equal -> untouched, adopted into lock (`unchanged`)
   - owned and unedited -> overwritten (`updated`)
   - owned but user-edited -> preserved (`kept`)
   - `force` match -> backup then overwrite (`updated`)
   - exists, not owned, `adoptUnknown=false`, not forced -> **preserved, no lock entry** (`unknown`)

   Because `.skills-lock.json` is absent, seeding staging with a byte-copy of the active tree would mark every *diverged* wrapper `unknown` and silently keep stale bytes. Staging must therefore start from **pure canonical sources** (delete generated mirror surfaces inside staging before running), not from the active generated state.
4. **Prune parity.** Pruning only touches entries present in the previous lock (`OwnershipWriter.ts:120-155`). With no lock, nothing is pruned, and the staged lock cannot authorize deletion in the active checkout. Deletions are out of scope; leftovers are reported, never removed.
5. **Symlink guard.** Writes fail closed if any path component *under* the root is a symlink (`cli/src/services/install/safePath.ts:1-60`). Symlinking `node_modules` into staging is safe only because nothing is written through it.
6. **Refs vs metadata.** `.skillsrc` pins `cybersecurity-v1.0.0` and `workflows_ref: workflows-v1.0.0` while metadata is now `1.0.1` / `1.1.8`. Local generation does not resolve these refs, but the disposable consumer smoke must not reuse them (its fixture only allows metadata-derived tags plus `main`/`HEAD`). `.skillsrc` is outside integration ownership — flag, do not edit.

## 4. Copy-back allowlist derivation rule

Derive, do not enumerate by hand:

```
allowlist := (
  for each agent in .skillsrc.agents:
    { agent.path + '/' + cat + '/' + skill + '/**' : cat in .skillsrc.skills, skill is emitted }
  ∪ { agent.path + '/' + cat + '/_INDEX.md' : cat in .skillsrc.skills }
  ∪ { workflow wrapper for (agent, key) : key in .skillsrc.workflows }
  ∪ { agent.agentPath + '/**' }                      // specialists, only if bytes change
  ∪ { agent.ruleFile outputs, agent.hook*, agent.mcp.projectFile }  // only if bytes change
) ∪ { skills/index.json, skills/*/_INDEX.md, skills/README.md, skills/metadata.json,
      AGENTS.md, server/AGENTS.md, README.md, cli/README.md }
```

Hard exclusions regardless of computed match: `.agents/workflows/**`, `.github/workflows/**`, `.agent/**`, `.skills-lock.json`, `.ags/**`, `node_modules/**`, `cli/dist/**`, `artifacts/**`.

Enforcement: enumerate every created/modified path in staging; if any path falls outside the derived allowlist, abort the copy-back with that path listed and change nothing.

## 5. Drift inventory (measured read-only at plan time; re-measure at execution)

| Measure | Value |
| --- | --- |
| `.skillsrc.workflows` entries | 33 |
| Canonical `.agents/workflows/*.md` | 38 |
| `.claude/commands/*.md` / `.github/prompts/*.prompt.md` / `.codex/skills/<key>/` | 36 / 36 / 36 |
| Wrappers with no configured key (unowned leftovers) | `discover-product`, `review-product-value`, `validate-product` on all three surfaces |
| Canonical workflows with no wrapper | `create-stitch-design`, `review-stitch-design` |
| Canonical vs mirrored skill counts | security: `cybersecurity` canonical 12, mirrors 11 (missing `cyber-lab-validation`) — the only skill-count drift; `typescript` 4/4, `common` 44/44, `product-management` 10/2 (include-filtered, expected), `quality-engineering` 14/14, `system-design` 13/13 |
| `skills/metadata.json` cybersecurity `token_metrics` | `total_skills: 11` (stale; `calculate-tokens` recomputes) |
| Expected byte-change surface | 12 workflow wrappers (4 edited cyber workflows x 3 surfaces), 4 new skill folders, 5 `_INDEX.md` (skills + 4 agent surfaces), `skills/index.json`, `skills/README.md`, `AGENTS.md`, `server/AGENTS.md` (only if router bytes change), `README.md`, `cli/README.md`, `skills/metadata.json` |
| Orphan wrappers / missing wrappers | **Decided**: preserved unchanged and reported; never deleted, adopted, or regenerated |

## 6. Environment: disposable dependency workspace (executed; stage retained)

**Why reuse is rejected.** The installed tree in the primary checkout (`/Users/nguyenhuyhoang/OtherProjects/agent-skills-standard`) is built from a *different* lockfile: `diff -q pnpm-lock.yaml <primary>/pnpm-lock.yaml` differs, and installed versions diverge at patch level — `vite` 8.3.0 vs worktree pin 8.3.5, `zod` 4.6.5 vs 4.6.7, `dotenv` 18.0.4 vs 18.0.8, `inquirer` 14.2.2 vs 14.2.4 (`tsx` 4.23.15, `cross-fetch` 4.1.0, `commander` 15.0.0, `fs-extra` 11.4.1, `picocolors` 1.1.1, `js-yaml` 5.4.2 match). Therefore reuse is not reproducible validation and is not used for the staged run, checks, or smoke.

**Verified install facts (read-only inspection):**

| Fact | Value |
| --- | --- |
| Declared manager | root `packageManager: pnpm@10.0.0` |
| Host manager | `pnpm --version` -> `10.0.0` (exact match) |
| Workspace packages | `pnpm-workspace.yaml`: `cli`, `server`, `mcp`, `website` |
| Lockfile | `pnpm-lock.yaml` present in this candidate; must be used frozen |
| `.npmrc` | absent |
| Dependency build-script policy | no `pnpm.onlyBuiltDependencies` / `neverBuiltDependencies` in root `package.json` (its `pnpm` key holds only `overrides`), i.e. pnpm's default script-blocking applies and must not be overridden |
| Project lifecycle script | root `prepare: husky` (the only install-adjacent lifecycle script; no `preinstall`/`postinstall` anywhere in the workspace) |
| Husky / install behavior | `prepare: husky` ran under the staged frozen install without `HUSKY=0`; install succeeded. No script-policy bypass was used. |
| Local store | `/Users/nguyenhuyhoang/Library/pnpm/store/v10`, ~941 MB |

**Executed install:** `rtk pnpm install --frozen-lockfile --offline` in `/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/tmp.8Xg7t9dNe5` succeeded in 6.45 seconds with no registry fetch. The stage lock SHA-256 is `09690165486f083cd9eaf2d8c38c459b871fce3a1815dd1a265f42de54200984`. Install output reported ignored dependency build scripts `@parcel/watcher`, `@scarf/scarf`, `esbuild`, `unrs-resolver`; none was approved or bypassed. Full install and provenance are recorded in `integration-execution-receipt.json`.

The command used the candidate `pnpm-lock.yaml` and declared `pnpm@10.0.0`; the stage is retained for parent validation. No active or primary checkout dependency state or lockfile was changed.

Rules:

- `--frozen-lockfile` always; no lockfile update, no dependency version change, no `pnpm add`/`update`/`approve-builds`, no `--ignore-scripts` (that would silently change declared lifecycle semantics).
- Offline store first. A registry fetch is permitted only as the second attempt, only under the existing network/tool policy, and only for the exact packages the offline attempt names.
- Existing script-approval policy is preserved: blocked dependency lifecycle scripts stay blocked. Their ignored-script list is recorded from install output in the receipt; it is not approved or bypassed.
- The store is shared and outside the repository; installs may add entries to it. No active-checkout or primary-checkout dependency files are touched.
- If neither attempt resolves, stop and report the exact pnpm error plus the missing package names. No fallback to the mismatched primary-checkout tree, no partial hand-built resolution.

No filtered install was used.

**Other environment facts:** Node `v22.14.0`; Slice E artifacts absent (`references/scenario-catalog.md` linked from `SKILL.md:64`, no `evals/`); `cli/dist` absent and is built inside staging from the staging install.

## 7. Procedure A — isolated generation and allowlisted copy-back (execution-time only)

Execution occurred only after the parent source-settlement signal. Commands, generation outputs, and outcomes are recorded in `integration-execution-receipt.json`; the staging path is retained for parent checks.

**A0. Gate check (passed).** Parent signaled source settlement after independent closure of C IR01–05 and E ER01–07. Staging used the candidate source snapshot at base commit `a2228857e4cf5b8ee2d71d96630c586618ec2edd`; evidence and destination hashes were captured immediately before generation/copy-back. No active generator ran.

**A1. Snapshot evidence + destinations.** The dedicated helper captured the execution-time baseline and 15 `.agent` file hashes outside `.agent`; the exact baseline and active destination hashes are preserved in `pre-integration-snapshot.json`.

**A2. Stage canonical sources and install.** The source tree was copied to `/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/tmp.8Xg7t9dNe5`, excluding `.agent`, `.git`, `node_modules`, `artifacts/runs`, and `cli/dist`. The exact-lock offline install succeeded there; no dependency symlink, active checkout install, or `HUSKY=0` override was used. The stage remains available for parent validation.

**A3. Staging-only mirror reset.** After the first generation pass, removed only the generated mirror directories in the disposable stage: `.claude/skills`, `.claude/commands`, `.claude/agents`, `.codex/skills`, `.codex/agents`, `.github/skills`, `.github/prompts`, `.github/copilot-agents`, and `.agents/skills`. `.agents/workflows` remained canonical. No active checkout path was removed.

**A4. Calculate tokens, then generate (staged only).** The first `rtk pnpm calculate-tokens` and `rtk pnpm generate-indices` completed before mirror reset. That pass is not treated as freshness proof. After resetting only generated mirror surfaces in the stage, both commands were run again and completed. The second `calculate-tokens` reported 12 cybersecurity skills and 229,868 tokens across 334 skills; the second generator reported 26 categories, 33 configured workflows on each of three wrapper surfaces, 89 skills, and 21 specialists. No destructive `.agent` cleanup line appeared.

**A5. Change-surface validation.** The final staged inventory contained 142 changed paths and zero unexpected paths. The generated `.skills-lock.json` and nine unowned orphan wrappers were excluded from copy-back; canonical `.agents/workflows` were preserved. Detailed diff: `stage-diff.json`.

**A6. Drift-checked file-only copy-back.** Copied 132 allowlisted changed files individually after destination drift checks. No directory copy, deletion, lockfile copy, or canonical workflow write occurred. Per-file source/destination digests: `copyback-files.json`.


**A7. Post-conditions.** `post-integration-checks.json` confirms all 15 `.agent` evidence hashes match, the active `.skills-lock.json` remains absent, all nine orphan wrappers are byte-identical, and canonical workflows match staging. The stage is retained; no parent suite or `git status` check was run by this worker.


`artifacts/runs/cyber-lab-validation/integration-execution-receipt.json` records stage provenance, install and generation results, build output, copy-back counts, preservation checks, consumer-smoke result, and scope limits. `copyback-files.json` contains per-file digests.

## 8. Procedure B — disposable consumer smoke for AC-CLV-16 (separate gate)

Reuse the reviewed primitives, not the existing product-evidence smoke: `scripts/skill-tests/product-evidence-integration/registry-fixture.mjs` exports `buildNarrowSnapshot(candidateRoot)` (freezes `skills/**` plus `.agents/workflows/*.md`, skipping dot-entries) and `startRegistryFixture(candidateRoot, options)` (in-memory HTTP, ephemeral port, rejects credential headers, only metadata-derived refs plus `main`/`HEAD`). The existing `scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs` has product-specific assertions and was not repurposed.

The corrected temporary `consumer-smoke.mjs` passed against the disposable stage. Two earlier runs exposed helper defects, not tool/environment blockers: attempt 1 used an invalid isolated `.skillsrc` that CLI logged as `Sync failed` while returning exit 0; attempt 2 restricted fixture hosts too narrowly. Both failure receipts (`consumer-smoke-attempt-1.json`, `consumer-smoke-attempt-2.json`) and their corrections are preserved.

Implementation and observed checks:

1. Freeze `skills/**` and canonical `.agents/workflows/*.md` bytes with `buildNarrowSnapshot`; serve them through `startRegistryFixture`.
2. Create an isolated consumer with the four agents, cybersecurity category, four configured workflows, and valid disabled MCP config (`enabled: false`, `scope: disabled`, `prompted: true`).
3. Run the staged CLI through awaited `execFile` calls with output capture and a 120-second timeout; this keeps the in-process fixture server responsive. Write the dirty-candidate manifest before assertions.
4. Verify the 18 resources admitted by the CLI package-resource filter (`SKILL.md`, `references/**`, `scripts/**`, `assets/**`, `LICENSE`, `NOTICE`) on each surface, the scoped-validation prohibition, all 16 exact workflow transformations, and local `verify` checksum agreement. The source directory has 19 files total; its 19th is `evals/evals.json`, which `SkillSyncService.isPackageResource` does not export. It is intentionally not counted as an installed consumer resource.
5. Successful run: 18 exported resources x 4 skill surfaces, 97 fixture requests, 87 tracked files verified, candidate snapshot SHA-256 `5617aefed711d3b38301c1bf5d22d64e816c88a369d905511cbbc8c10dca1c59`. Consumer and fixture are removed in `finally`; receipts remain under `artifacts/runs/cyber-lab-validation/`.

Honest limitations: this is dirty-working-tree packaging/parity evidence, identified by snapshot digest and base commit, not a tagged release or reproducible from `base_commit` alone; it is not behavioral or model-compatibility evidence; MCP integration paths are not exercised. Staged dependencies came from this candidate's exact frozen lockfile.

## 9. Post-settle verification ledger (parent-run, existing scripts)

| Purpose | Command (verified in `package.json`) |
| --- | --- |
| SDLC workflow audit | `pnpm audit:sdlc` |
| Skills + structure | `pnpm validate:all` |
| Task/answer alignment | `pnpm check-alignment` |
| Keyword collisions | `pnpm audit:keywords` |
| Metadata/skill audit | `pnpm audit:skills` |
| Prompt-injection scan | `pnpm audit:injection` |
| Freshness | `pnpm freshness:audit` |
| Formatting | `pnpm format:check` |
| Capability doc parity (must be unchanged) | `pnpm docs:capabilities:check` |
| Disposable consumer smoke (§8) | PASS: 18 package files x 4 skill surfaces; 16 workflow content comparisons; 97 fixture requests; candidate snapshot SHA-256 `5617aefed711d3b38301c1bf5d22d64e816c88a369d905511cbbc8c10dca1c59`. |
Parent-reported, not re-executed by this worker: parity `132/116/16` PASS; targeted eval preflight PASS with `0` issues; independent reviewer accepted scope.

Not acceptable as evidence: a green `generate-indices` run alone (it is not parity proof), any structural check claimed as behavioral baseline, and any run performed while C/E sources are still moving.

## 10. Settled decisions, remaining blockers

**Settled without operator re-approval (parent directive 2026-10-24):**

1. Orphan wrappers (`discover-product`, `review-product-value`, `validate-product` on `.claude/commands`, `.github/prompts`, `.codex/skills`) and canonical-only workflows (`create-stitch-design`, `review-stitch-design`) are preserved unchanged and reported. No deletion, no adoption, no regeneration, no allowlist membership.
2. Active `.skillsrc` refs stay unchanged (`cybersecurity-v1.0.0`, `workflows-v1.0.0`); the smoke uses its own consumer config.
3. `.skills-lock.json` is never copied back; no prune authority reaches the active checkout.
4. Dependency installation occurs only after source settlement, in disposable staging, using this candidate's frozen lockfile and declared manager version. Local store offline first; only exact missing packages may be fetched on a permitted second attempt. Never use mismatched primary-checkout dependencies as validation, mutate active/primary dependency state, or copy a lockfile.
5. Staging-only deletion of generated mirror surfaces is permitted strictly under §7 A3's per-path derived-output proof, with file-only (no whole-directory) copy-back.

**Remaining parent-owned work and risk:**

1. The parent integrated acceptance and independent scope review are complete; their durable record is `artifacts/runs/cyber-lab-validation/parent-validation.json` and the archived `implementation-review-report.md`.
2. Parent-run validation outcomes are recorded in that receipt and are not claimed as worker-executed. The stage remains available at `/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/tmp.8Xg7t9dNe5`; parent owns its cleanup. It is retained for convenience, not required runtime.
3. The `402 Insufficient Balance` Personal-DeepSeek request remains historical routing evidence; no retry or subdelegation occurred.
4. **Unchanged risk**: `cleanupOldFolders()` remains destructive in the active checkout. Mitigation was isolation only; no generator-code change was proposed (out of scope).

## 11. Non-goals

No edits to skill/workflow/eval sources, governance docs, or generator/CLI source code. No live lab actions, model runs, paid evaluations, publication, commit, push, release, or deployment. No claim of model compatibility, G3/G4/G5 progression, release readiness, or AC-CLV-16 beyond the recorded local packaging/parity smoke.

## 12. Executed-inspection ledger for this revision

The disposable stage was installed, generated, built, and used for file-only allowlisted copy-back. The corrected local consumer smoke passed. Worker-run receipts: `integration-execution-receipt.json`, `consumer-smoke-result.json`, `consumer-candidate-manifest.json`, `consumer-smoke-edit-receipt.json`, `consumer-smoke-attempt-1.json`, `consumer-smoke-attempt-2.json`, `stage-diff.json`, `copyback-files.json`, and `post-integration-checks.json`. Parent-run integrated checks and their limits are recorded in `parent-validation.json`; these are not claimed as worker-executed.

## 13. Final review, durable evidence and cleanup

The final independent review approves the exercised repository implementation/export/local consumer-fixture scope. C IR01–IR05, E ER01–ER07 and IE01 are closed. The review and all eight full source reports are preserved under `artifacts/runs/cyber-lab-validation/evidence/`; `MANIFEST.json` records each source path, source and destination SHA-256, byte size and identity result. The `docs/srs/srs-walkthrough-cyber-lab-validation.md` section “Implementation delivery evidence — repository scope” links the durable package and validation receipts.

The parent validation receipt records 85/85 eval tests, warning-qualified `validate:all` and alignment checks, passing SDLC/capability checks, the corrected 0-issue eval preflight (with its prior 7-issue failure retained), 132/116/16 generated-output parity, and the final 18-resource consumer smoke (with both earlier helper failures retained). No live/model/MCP behavior, consumer inherited root-license presence, or G3/G4/G5 approval is claimed.

Temporary helper source hashes and removal outcomes are recorded in `artifacts/runs/cyber-lab-validation/helper-cleanup-receipt.json`. Durable receipts and source reports remain; only the named disposable helper scripts are removed. The staging directory is retained for the parent and is not required at runtime.
