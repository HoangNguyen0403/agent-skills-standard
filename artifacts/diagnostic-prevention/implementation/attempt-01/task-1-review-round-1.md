# Task 1 — Independent Spec, Quality and Security Review, Round 1

**Status: FINAL — frozen review report.**

**Spec compliance: CHANGES REQUESTED.**  
**Quality/security: CHANGES REQUESTED.**

Reviewed the complete immutable `task-1-review-round-1.diff`, Task 1 brief/report, implementation plan Global Constraints, approved spec H03/S06, and necessary direct source/callers. Findings below are static source findings; **no tests, build, lint, formatters or generation executed**. Parent verification remains pending. No implementation files changed. This report artifact is explicitly authorized. No host enforcement claimed.

## Findings

### 1. [BLOCKER] `scripts/generation/index.ts:8` — Consumer entrypoint derives the wrong repository root

`__dirname` is `<repo>/scripts/generation`; resolving one parent produces `<repo>/scripts`, not `<repo>`.

**Why:** Both the reported consumer command and `.husky/pre-commit` invoke this entrypoint from the repository root. `runIsolatedGeneration()` rejects immediately at `isolated-stage.ts:158–161`. The newly installed preparation/check path cannot perform its intended function.

**Fix:** Derive the authoring root two levels above this entrypoint, compare physical roots, and cover the actual CLI invocation—not only an imported helper.

### 2. [MAJOR] `scripts/generation/isolated-stage.ts:213–220` — Declared output discovery excludes most actual generated surfaces

Only five paths are checked/copied. Actual generation also writes:

- Canonical `skills/<category>/_INDEX.md` — `generate-indices.ts:173–178`.
- `skills/README.md` — `generate-indices.ts:207–306`.
- Configured native skills, workflow wrappers, category indices, rules and specialist exports — `generate-indices.ts:199–202,310–407,419–424`.
- Conditional `cli/README.md` changes — `calculate-tokens.ts:194–198,263–265`.

**Why:** After fixing finding 1, `--check` can report success while installed discovery outputs are stale, and apply mode discards required staged changes. The hook therefore does not validate complete prepared outputs. This violates the brief’s actual-output and S06 discovery requirements.

**Fix:** Build a bounded, configuration-derived inventory of generated paths before generation; baseline every declared destination’s bytes/absence. Distinguish generated outputs from canonical inputs, static files and stage-only lockfiles. Check/apply the complete declared output set and reject unexpected output drift.

### 3. [MAJOR] `scripts/generation/isolated-stage.ts:190–211` — Category-directory containment is not host index ID-set verification

The validator compares metadata category names with directory names. It never reads `.skillsrc` selections, parses host `_INDEX.md` skill rows, or compares those rows with canonical selected skill IDs.

**Why:** Removing one selected skill row from every host index leaves all categories present and passes this validator. Cross-host agreement or matching existing-file hashes would not detect the omission. This directly misses the approved 43-of-45 failure requirement (S06 acceptance; Task 1 brief lines 9–11). Copying existing mirrors into the stage also permits the existing ownership writer to keep unknown/stale output: `OwnershipWriter.ts:106–117` preserves differing unknown files, while generation starts with `force: []` at `generate-indices.ts:330`.

**Fix:** Derive expected canonical skill IDs from the configured categories and include/exclude rules; independently parse and compare the complete selected ID set for each configured host after regeneration. Regenerate declared stale outputs in the stage without deleting mirror package inventories or forcing unknown active-checkout files. Add an omitted-row negative control.

### 4. [MAJOR] `scripts/generation/isolated-stage.ts:65–78,224–237,358–377` — Symlink handling does not establish stage or copy-back containment

`copySourceToStage()` preserves source symlinks (`dereference: false`). The generators then write normal paths beneath those copied links. Destination checks only `lstat` the terminal file when `pathExists()` succeeds; they do not reject symlink ancestors or dangling symlinks.

**Why:** A source `docs` directory symlink with an absolute external target is preserved in the stage; `generate-capabilities-doc.ts:46` then writes through it even in `--check` mode. At copy-back, `docs/agent-capabilities.md` under a symlinked `docs` parent appears to be a regular terminal file and can overwrite the external target. These are existing-link paths, not an adversarial race-window claim. Calling the operation isolated/check-only does not make these writes safe.

**Fix:** Reuse `assertNoSymlinksUnderRoot()` from `cli/src/services/install/safePath.ts` for declared read/write destinations and ancestors, including dangling links; reject escaping source links before executing generators. Permit only explicit dependency links, which must not be generator output destinations. Compare physical cwd and script-derived physical root using realpath rather than lexical `path.resolve` alone.

### 5. [MAJOR] `scripts/generation/isolated-stage.ts:164–186,241–243,429–434` — Stage allocation and attempt publication are not exclusive

The stage is a predictable sibling path derived from `attemptId`, populated using `ensureDir`/`fs.copy`, and unconditionally removed in `finally`. No exclusive allocation proves this invocation owns that directory. The log guard checks only an existing `generation.log`; actual log/receipt writes use overwrite-capable APIs later.

**Why:** Reusing an attempt ID with a fresh `logDir` can merge into and then delete an existing stage belonging to another invocation. Concurrent same-ID calls can both pass the log existence check before either writes, share a stage, overwrite logs/receipts, and delete each other’s work. A receipt-only prior attempt is also not protected. This violates fresh-stage allocation and immutable per-attempt evidence requirements without requiring a hostile local actor.

**Fix:** Allocate the stage with `mkdtemp`; exclusively create/reserve the attempt directory before execution, refusing every existing attempt directory. Publish logs/receipts exclusively and remove only the stage actually allocated by this invocation. Validate any caller-supplied attempt identifier before using it as a path component.

### 6. [MAJOR] `scripts/generation/isolated-stage.ts:297–341,344–379` — Exact staged-byte checks and final current-destination checks are incomplete

`stagedDigests` is populated but never used to verify bytes immediately before copy-back or after writing. `fs.copy()` is described as atomic but directly overwrites destinations. Drift checks run only in apply mode and only for `filesToCopyBack`, not all declared destinations.

**Why:** If a destination initially matches generated output but changes during staging, check mode compares only the original baseline to the stage and returns PASS without examining the current destination. Apply mode can similarly report completion while ignoring drift on declared files not selected for copy-back. If staged bytes change after hashing, the copied bytes are not bound to the captured digest. Copy failures after earlier successful writes also return `copiedBackFiles: []`, hiding partial effects (`:402–427`). The report’s exact-check/atomicity claims exceed the implementation.

**Fix:** Revalidate all declared destination baselines in both check and apply paths; verify each staged source against its captured digest before writing and verify the resulting destination digest. Use bounded per-file atomic publication and report actual partial effects on failure. Preserve the stated cooperating-writer limitation; do not claim a hostile-writer sandbox or cross-file atomic transaction.

### 7. [MAJOR] `scripts/generation/isolated-stage.ts:246–261` and `scripts/calculate-tokens.ts:271` — A swallowed token-generation exception still looks successful

The stage coordinator accepts the token phase solely from its process exit status, but `calculate-tokens.ts` ends with `main().catch(console.error)`, retaining a zero exit status after a rejected `main()`.

**Why:** A token phase that fails before finishing its metadata/README writes can be treated as successful, and the coordinator continues with remaining phases. The Task 1 report says phase failures propagate, but only `generate-indices.ts` was corrected. Parent tests or an exit-zero command cannot repair this failure-propagation contract.

**Fix:** Ensure every invoked generator reports rejected execution as nonzero, or provide an equivalent authoritative phase-completion contract checked by the coordinator. A minimal related calculator exit-status change should be explicitly added to the owned scope by the parent. Test a real child phase failure and assert no destination mutation and a retained failed receipt.

### 8. [MAJOR] `scripts/generation/isolated-stage.ts:117–121` — New command requires a newer runtime than the declared Node floor

`Promise.withResolvers()` is not available on Node 20, while root `package.json:116–117` declares `node >=20.0.0`; `.github/workflows/ci.yml:47,73,131` also uses Node 20.

**Why:** Once the entrypoint root is fixed, staged execution fails at its first `runInStage()` call on a supported runtime. Running locally on a newer Node version would not establish compatibility with the repository contract.

**Fix:** Use the existing Node-20-compatible Promise constructor pattern. Do not raise the runtime floor for this bounded safety repair. Parent verification should include the declared runtime floor.

### 9. [MAJOR] `scripts/generation/isolated-stage.test.ts:13–40,90–104` — Required behavioral regressions are missing or misleading

The test named “baseline drift or modified destination aborts copy-back leaving destination untouched” never calls `runIsolatedGeneration()` or copy-back. It only hashes two different file contents and asserts inequality. The category test exercises category-name membership, not host index row coverage. The copy fixture places its stage inside the source directory (`:14–15,26`), a source-to-descendant copy rejected by fs-extra rather than a valid staging fixture.

**Why:** The changed business contract is fail-closed, evidence-preserving staged generation. Plausible consumer-visible faults—copying over concurrent edits, accepting missing host rows, or applying after phase failure—escape this suite. A scoped search of `scripts` and `cli/src/services/__tests__` found coordinator calls only in the two early-rejection tests in this file and the production entrypoint; no nearby coordinator-path tests supply the missing coverage. The drift assertion would pass even if all production drift protection were removed. The report’s drift-coverage claim is therefore misleading.

**Fix:** Replace the hash-only case with a deterministic coordinator/real-filesystem scenario. Use distinct sibling source and stage fixture directories. Add the brief’s stage failure/no destination mutation, absent-to-unexpected-present, modified destination, omitted host row, actual entrypoint foreign-cwd/no-write, and repeated-attempt preservation cases. Verify bytes/path retention and failure receipts, not mock choreography or success banners. Keep original RED marked NOT RUN.

## Spec compliance assessment

| Task 1 criterion | Static assessment |
|---|---|
| Stop blanket `.agent` migration/deletion | Implemented conservatively in `SyncService.ts:732–748`; no copy/remove remains in the migration method. Runtime result pending. |
| Real migration preservation across repeat invocation | Meaningful sentinel-byte/path checks added through lifecycle ingress. However, the destination “conflict” fixture creates `.agents/custom-note.md` without a same-relative-path `.agent/custom-note.md`; it proves unrelated custom-file preservation, not a true source/destination conflict. Add that matching conflict fixture. |
| Foreign cwd rejected before mutation | Direct index generator adds a preflight guard, but it is lexical rather than a physical-root comparison; the new CLI root is incorrect. |
| Nonzero generator failure | Index-generator catches rethrow; token phase still swallows failures. |
| Fresh isolated stage and explicit dependency reuse | Exclusions and explicit dependency links exist; exclusive allocation, symlink containment and immutable attempt publication are incomplete. |
| Complete generated output preparation/check | Incomplete inventory and no canonical-to-host ID-set check. |
| Exact copy-back and concurrent drift protection | Initial baselines exist, but check-mode drift, staged digest revalidation, final digest verification and complete destination checks are missing. |
| Check-only precommit, no git add | Hook removes active in-place generation and git add, but points to the broken CLI and incomplete/symlink-unsafe check path. Hook execution not performed. |
| Required regression scenarios | Partial only; substantive missing and misleading tests identified above. |

## Evidence and limits

- Review basis: cumulative frozen `task-1-review-round-1.diff` against base `52ac482a5b948d9d26df4c3a2617afec74d1cf54`, not unrelated workers’ edits.
- Source provenance: local parent-provided review package; treated as semi-trusted until source inspection. Worker success text is not acceptance evidence.
- Actual source inspections confirmed the decisive implementation paths and direct generator writes. No runtime exploit, Node compatibility run, hook execution, or test result is claimed.
- No new credential flow or network feature was introduced in the reviewed helper; this is not proof of network isolation. Child processes inherit the process environment. Dependency links are not a read-only mount or host enforcement boundary.
- The report’s preservation-over-cleanup choice is sound; generation safety and verification claims are not yet supported.
- Minimum correction order: fix consumer root/runtime compatibility; establish fresh-stage/attempt ownership and containment; discover full declared outputs and validate canonical host ID sets; complete exact digest/drift checks and failure propagation; replace misleading tests; then parent runs settled focused gates and actual consumer check on a new attempt.
- No source changes, tests, build, lint, formatters, generation, installation, commits, deployment or host configuration changes were performed by this reviewer.

## Loaded rules and accounting

Read `AGENTS.md`, `code-review`, `caveman-review`, `sdd-evidence-preservation`, `ags-generator-safety`, the repository review policy and trust policy. MCP loaded: `typescript/typescript-language`, `common/common-best-practices`, `common/common-tdd`, `common/common-code-review`, `common/common-security-audit`, `common/common-owasp`, `common/common-llm-security`, `nestjs/nestjs-testing`, `angular/angular-testing`, `nextjs/nextjs-testing`. Framework-specific UI rules do not describe these Node scripts. MCP compliance audit completed; its generic React routing warning does not identify a React surface in this slice.

Exact actor token usage and monetary cost unavailable. MCP cost output is partial; catalog workflow listings are not workflow-body consultations or proof of use.
