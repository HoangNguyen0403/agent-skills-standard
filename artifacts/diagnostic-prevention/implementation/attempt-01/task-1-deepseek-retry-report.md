# Task 1 — Phase 0 prerequisite freeze (Personal - DeepSeek retry batch)

**Status: PHASE0 FROZEN.** This is **not** Task 1 completion and not a generation/review acceptance.
Profile actually used: `Personal - DeepSeek` (`omp/river/deepseek-ai/DeepSeek-V4.1-Flash-1017`, write/low) as selected by the user's retry exception.
Workspace: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`; branch `feat/diagnostic-prevention-improvements`; HEAD `52ac482a5b948d9d26df4c3a2617afec74d1cf54` (unmodified, working tree dirty).
Executed phase boundary per the continuation brief: Phase 0 only. Production coordinator rewrite, metadata token-metric scope, and the four-contract implementation were **not** started.

## Worker execution status

Nothing was executed by this worker: no tests, test runners, probes, `tsc`, build, lint, formatters, generators, root check/apply/adoption, publication, commits, installs or network. No nested agents. Every result below is a static source statement; it is not behavioral evidence.
Importantly: the previously observed coordinator failures (35 total / 1 PASS / 34 FAIL setup failures) and the strict typecheck diagnostics reported by the parent remain the only behavioral/type facts; this batch neither re-ran nor qualified them.

## Changed files (this phase only)

| Path | Change | SHA256 (this phase) |
| --- | --- | --- |
| `scripts/generation/isolated-stage.ts` | R5-A declaration only | `c75d1cde57f788d55d72745b6ccd3145dcc4b05832ab389ecadf82e3be5eb8f5` |
| `scripts/generation/index.ts` | optional `--root <dir>` ingress | `84c750d2a67c931690b61a0a52740c6c30a037fb71014d70d11f13fee737669a` |
| `scripts/generation/isolated-stage.test.ts` | mock seam, message typing, new public-ingress scenario | `e1712e7a76116c8d73ac9aac38239eb0f25f2174e700f1ab23d7fdd18f45e08b` |
| `CONTRIBUTING.md` | generation subsection: `--root` contract sentence only | `334e3f56b398181ea2b2077b3cf93c1802eb6456e4f36e4741fafa0e910f0d0a` |

No other path was modified in this phase. The existing real `buildGenerationPlan(root)` fixture initialization and root+CLI `linkDependencies` fixture fix were left untouched. Frozen prior writers' bytes were not rewritten.

## 1. R5-A — invocation-local lock baseline (blocker)

`scripts/generation/isolated-stage.ts:2135` now declares the invocation-local state next to the lock state:

```ts
let currentLock: SkillsLockFile | null = null;
let stagedLock: SkillsLockFile | null = null;
let lockBaselineDigest: string | null = null;
```

Preserved, not bypassed:
- capture at `2168–2171` from `currentDestinationDigest(repoRoot, '.skills-lock.json')`;
- immediate recheck at `2172–2175` (manifest changed while baseline captured);
- pre-publication drift recheck at `2363–2366`;
- `persistVerifiedOwnership(..., lockBaselineDigest, ...)` arg at `2474`.

No suppression (`@ts-ignore`/`any` casts), no changed drift semantics, no error swallowed. Line numbers after 2135 shifted by exactly +1.

## 2. Changed-test semantic typing (no suppression)

**Optional message arguments.** All 20 `assert.<op>(..., true, <result>.error)` sites now pass a definite string: `<result>.error ?? ''` (`applied` ×10, `result` ×5, `checked` ×2, `adopted` ×2, `first` ×1). `IsolatedStageResult.error` is `string | undefined`, so the previous values were not valid assertion messages. Message values only; no assertion subject, operator or expectation was altered.

**Readonly `fs.rename`.** Both post-rename tests no longer assign to the `fs-extra` module binding. They use the `node:test` mocking API already available to this module:

- `test('a post-rename verification failure still reports the renamed destination', async (t) => ...)` — `t.mock.method(fs, 'rename', impl)` at `1082`, restored at `1108` in `finally`.
- `test('a post-rename ownership-manifest failure reports the ledger as applied but unverified', async (t) => ...)` — same at `1119` / `1141`.

Behavior preserved exactly: the first mock appends `CORRUPT\n` after every real rename; the second appends only when the rename target is `<root>/.skills-lock.json`. `realRename` capture and call-through are unchanged. Mock lifetime is confined: installed inside the fixture body after fixture creation, restored before `withFixture` teardown, so fixture creation and cleanup never run under the mock. No `as any`, no `@ts-expect-error`, no weakened assertion.

## 3. Lawful public ingress for a real-producer fixture

`scripts/generation/index.ts` gains one optional argument; the default is unchanged:

```
Usage: generate-indices [--check] [--adopt-base <fullsha>] [--root <dir>]
```

- `--root <dir>` resolves the target repository; without it the authoring root remains `path.resolve(__dirname, '..', '..')`.
- Rejected: repeated `--root`, missing value, value beginning with `--` (all folded into one invalid-argument error), unknown arguments.
- The `runIsolatedGeneration` foreign-working-directory refusal (`isolated-stage.ts:2070–2077`) is untouched, so `--root` does not widen authority: the physical `process.cwd()` must still equal the resolved target root. The existing refusal test therefore keeps its exact meaning and was not modified.

Design decision and rejected alternative: setting `repoRoot = process.cwd()` would have made a temporary repo reachable without a new flag, but it would turn the foreign-cwd refusal into a success path and invalidate the existing safety test — i.e. it would weaken an existing test to gain the ingress. `--root` adds one explicit, documented surface instead; cost is a new optional CLI argument (dev-only tooling).

`CONTRIBUTING.md` §8 generation subsection records exactly this contract (two added sentences). The candidate/Task1-gating note, rule16 and layered-acceptance sections were not touched.

## 4. New reachable scenario

Test name: **`the public entrypoint check leaves a no-change real-producer fixture and its manifest untouched`** (`isolated-stage.test.ts:1212`).

It runs the real producers through the real fixture baseline (`populateFixtureRepo`), then spawns the **public entrypoint** — `node --import tsx <repo>/scripts/generation/index.ts --check --root <fixture>` with `cwd = <fixture>` — and asserts:

- exit code `0`;
- stdout `Isolated generation check passed`;
- byte equality before/after for `AGENTS.md`, `.github/skills/common/common-alpha/SKILL.md` and `.skills-lock.json` (destination plus manifest unchanged);
- the emitted receipt is `status: 'PASS'`, `checkOnly: true`.

It does not fake producer output or ownership, is not an import-only smoke, adds no source-copy test and no incidental default assertion. Test count in the file: 35 → 36.

Parent commands (parent-owned; **NOT RUN by this worker**):

```
rtk proxy node --import tsx --test scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "public entrypoint check leaves a no-change" scripts/generation/isolated-stage.test.ts
```

The full covering command from the plan remains `rtk proxy node --import tsx --test scripts/generation/*.test.ts`.

## 5. Deliberately not done (Phase 1 and later)

- No coordinator rewrite: R5-B (whole staged manifest persistence / unrelated ownership and silent equal-byte adoption), R5-C (producer and capability-table drift inputs), R5-D (Git tree/index adoption revalidation at publication) remain **open**.
- The v2 `generation`-namespace metric-only scope for `skills/metadata.json` was **not** implemented; no metadata, lock, mirror, `.agent` or generated bytes were touched.
- No `package.json` change: the existing `generate-indices` script is sufficient for the entrypoint ingress, so no new verification command was added.
- No root command, adoption, publication, archive creation or receipt was produced.

## 6. Risks and open decisions for the parent

1. **Ingress ratification.** `--root` is the prerequisite for the later "full check/apply/check via the public entrypoint in temporary repositories" requirement. If the parent prefers a different ingress (env var, separate fixture harness), only `index.ts` + the two CONTRIBUTING sentences + the new test need revision.
2. **Runtime qualification of the mock seam.** Static typing is sound (`node:test`'s `MockFunctionContext.restore()`), but the `t.mock.method` replacement of the `fs-extra` module binding has not been executed. Node replaces/restores own writable+configurable properties; the fixture-creation and teardown ordering that avoided the old assignment race is preserved. Parent should watch for any restore-ordering failure in those two tests specifically.
3. **Typecheck coverage.** Any scoped strict no-emit check must include `scripts/generation/index.ts` (the public entrypoint) as well as the two generation files, per the parent's latest instruction. The three imported baseline diagnostics (ConfigService `TS2352`, SyncService `TS2550`, RemoteMetadata `TS2559`) are untouched by design.
4. **Not qualified by this batch.** Coordinator transitions, the 34 previously setup-failed scenarios, real producer parity, adoption proofs, wrapper alignment and any Node 20 runtime claim remain unverified. Phase 0 is a foundation checkpoint, not acceptance.

## 7. Evidence identity

- HEAD: `52ac482a5b948d9d26df4c3a2617afec74d1cf54` (unchanged).
- `scripts/generation/` is untracked in this worktree; per-file SHA256 above is the current identity.
- Previous reports, review diffs, receipts and failed-attempt evidence were read-only for this batch and are unchanged.

---

# Correction round 1 — Phase 0 FINAL (supersedes the sections above where they differ)

**Status: PHASE0 FROZEN (final).** Task 1 is still **not** complete; Phase 1 is **not** released.
The parent ran the strict semantic check including the public entrypoint and observed **zero generator/test diagnostics**, with only the three exact pinned-BASE imported CLI errors remaining (ConfigService `TS2352`, SyncService `TS2550`, RemoteMetadata `TS2559`). No overall `tsc` PASS is claimed by anyone.
Nothing was executed by this worker in this correction either: no tests, probes, `tsc`, build, lint, formatters, generators, root commands, commits.

## Ruling applied

The parent did **not** ratify a new `--root` API: it is unnecessary for fixture work and outside the requested production behavior. The ingress now uses a real copied temporary project instead.

## Corrections

1. **`scripts/generation/index.ts` — `--root` removed.** Argument parsing, usage string and validation are restored to the pre-Phase-0 form; 55 lines, byte-identical to the pre-Phase-0 content (SHA256 `bb71fb527da60a62e1d977dd77bf7b187ea6fa49fc3a42d98cfec8ceba7a5bb0`). Script-derived root (`path.resolve(__dirname, '..', '..')`) and the foreign-working-directory guard are the only root mechanism again.
2. **`CONTRIBUTING.md` — the two `--root` sentences removed.** The generation subsection now carries only the earlier route-3 command/adoption contract (`git diff --numstat` vs HEAD: `44 0`). No other section touched.
3. **Fixture copies the real generation runtime sources.** `writeMinimalProducerTree` now also copies `scripts/generation/` into the fixture root, excluding `*.test.ts` and retaining relative imports, so the fixture is a real temporary project layout containing the public entrypoint itself.
4. **Public scenario runs the copied entrypoint.** `the public entrypoint check leaves a no-change real-producer fixture and its manifest untouched` now spawns `node --import tsx <fixture>/scripts/generation/index.ts --check` with `cwd = <fixture>`; no root argument, no alternate environment. The copied entrypoint derives its authoring root from its own location and therefore exercises the same default-root path production uses.
5. **Incidental prose pin deleted.** The `assert.match(stdout, /Isolated generation check passed/)` assertion was removed. Retained: actual exit code `0`, receipt discovered from the real CLI output and parsed (`status === 'PASS'`, `checkOnly === true`), and byte equality for `AGENTS.md`, `.github/skills/common/common-alpha/SKILL.md` and `.skills-lock.json` before/after.
6. **Foreign-cwd refusal case unchanged** (`the generator entrypoint refuses a foreign working directory before writing`, still spawning the repository entrypoint with a fixture cwd, still expecting exit 1, `/foreign working directory/`, and no `artifacts/generation-logs`).

## Phase 0 FINAL changed paths and identities

| Path | Net change vs pre-Phase-0 | SHA256 |
| --- | --- | --- |
| `scripts/generation/isolated-stage.ts` | R5-A declaration only (`:2135`) | `c75d1cde57f788d55d72745b6ccd3145dcc4b05832ab389ecadf82e3be5eb8f5` |
| `scripts/generation/isolated-stage.test.ts` | mock seam (`:1082/:1108`, `:1119/:1141`), `?? ''` message args (20 sites), fixture generation-source copy (`:94–100`), one public-ingress scenario (`:1223`) | `f5ca4a17df6a7f86cf4f98374d460622c447ba25bb64a5f434756a0f4d9a18a9` |
| `scripts/generation/index.ts` | none (reverted byte-for-byte) | `bb71fb527da60a62e1d977dd77bf7b187ea6fa49fc3a42d98cfec8ceba7a5bb0` |
| `CONTRIBUTING.md` | none from this batch (route-3 subsection only) | `c6cf588564fecf6b1904baef25bf21a22518f1908eedf19744e0e8db054a6242` |

Test count in the file: 35 → 36. HEAD unchanged: `52ac482a5b948d9d26df4c3a2617afec74d1cf54`.

## Parent commands after re-freeze (NOT RUN by this worker)

```
rtk proxy node --import tsx --test scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "public entrypoint check leaves a no-change" scripts/generation/isolated-stage.test.ts
```

## Residual risks

- The copied entrypoint must resolve `tsx`, `js-yaml` and `../../cli/src` from the fixture root; the existing fixture `node_modules` junction plus `linkDependencies(REPOSITORY_ROOT, root)` is the only mechanism relied on (no install, no alternate environment).
- The `t.mock.method` rename seam is statically sound but still unexecuted; restore ordering (install after fixture creation, restore in `finally` before fixture teardown) is unchanged from the report above.
- R5-B, R5-C, R5-D and the metadata metric-scope namespace remain open; no coordinator rewrite was attempted.

---

# PHASE1A FROZEN — tests/fixtures only

**Status: PHASE1A FROZEN.** Test/fixture work delivered; Task 1 is **not** done and Phase1B is **not** started. Production is untouched and still matches the qualified Phase0 bindings.
Worker execution: **NOT RUN** — no tests, test runners, probes, `tsc`, build, lint, formatters, generators, root commands, git commits or agents. Every statement below is a static source statement, not an observed outcome.

## Changed files

| Path | Change | SHA256 |
| --- | --- | --- |
| `scripts/generation/isolated-stage.test.ts` | fixture Git snapshot, prose-pin removal, apply-test contract, exclusion split, fault-injection prerequisites, R5-B1/B2/C/D regressions | `707ad3b672134138c9c8fb4604bb06e96a14a71327bb734116948b6bbcfc88a2` |
| `scripts/generation/isolated-stage.ts` | **unchanged** (frozen production) | `c75d1cde57f788d55d72745b6ccd3145dcc4b05832ab389ecadf82e3be5eb8f5` |
| `scripts/generation/index.ts` | **unchanged** (frozen production) | `bb71fb527da60a62e1d977dd77bf7b187ea6fa49fc3a42d98cfec8ceba7a5bb0` |

Test count 36 → 41. HEAD unchanged: `52ac482a5b948d9d26df4c3a2617afec74d1cf54`. No production, metadata, version or documentation file was edited in this phase.

## 1. Lawful Git fixture (adoption prerequisite fix)

`commitFixtureBase` now stages the same explicit pathspecs with `:(exclude,glob)**/node_modules` and `:(exclude,glob)**/node_modules/**`, so the fixture commit/`git archive` contains no dependency links while `node_modules` and `cli/node_modules` remain linked in the execution environment. The production symlink refusals are untouched; `proveBaseProducerOutputs` still runs `assertNoSymlinksRecursively` **before** its own `linkDependencies(repoRoot, snapshotRoot)` (`isolated-stage.ts:1501`, `:1541`). This addresses the 11 adoption cases that rejected a Git-archived `cli/node_modules` symlink instead of reaching the intended proof.

## 2. Incidental error-prose pins deleted (no re-pinning)

Removed every wording regex on `result.error`/`stderr`: mixed-AGENTS adoption, absent-from-base output, changed tracked bytes, untracked index entry, source/custom-overrides mismatch, poisoned base output, poisoned metadata, edited-owned specialist/mirror/bridge/index, unowned difference, nonzero child, canonical drift, canonical omission, destination drift, absent-destination appearance, stale `--check`, post-rename failures, absent workflow source, source symlink, and the two attempt-id rejections plus the foreign-cwd stderr pin.
No typed public error class exists in this surface, so no error framework was invented.

Replaced by one substantive helper — `assertRefusedWithoutEffects(result: IsolatedStageResult)` — asserting: `success === false`, `copiedBackFiles` empty, `verifiedFiles` empty, receipt `status === 'FAILED'`, `receipt.appliedFiles`/`verifiedFiles` empty. Each test keeps its own byte-preservation, ownership-preservation and "unrelated state untouched" assertions. Assertions that pinned which workflow/edit/index entry was affected were replaced by effect assertions (drift bytes present, original bytes intact, index deletion preserved, no applied files).

Positive controls that keep these negatives from passing vacuously: the successful apply/publication test, the two adoption positives, the README-metrics adoption positive, the CLI-refresh preservation test, the exclusion-success test, and the public-entrypoint no-change test.

## 3. Apply contract corrected to exact changed publication

`apply publishes the changed consumer outputs with real producer formats and preserves unrelated bytes` now captures `.github/prompts/demo.prompt.md`, `.github/copilot-agents/specialist-arch.instructions.md`, `.github/skills/common/common-alpha/LICENSE.TXT` and `.github/skills/common/common-beta/SKILL.md` before an Alpha-description edit, then asserts:

- the changed consumer output `.github/skills/common/common-alpha/SKILL.md` **is** published and carries the revised description;
- each unrelated output is **not** in `copiedBackFiles` and its bytes are byte-identical afterwards;
- canonical and host category index parity is preserved (no malformed/duplicate ids; ids `common-alpha`/`common-beta`);
- `verifiedFiles === copiedBackFiles` and the receipt is `APPLIED` with matching `copiedBackFiles`.

Universal `copiedBackFiles` inclusion and `LICENSE_TEXT` re-assertion inside the apply test were removed; resource inheritance is still proven by the root `LICENSE`/`NOTICE` variant test.

## 4. Exclusion split into success + hostile injection

- `an exclusion selection change regenerates the host surface without the excluded skill` — `EXCLUSION_CONFIG` (`exclude: [common-beta]`) must **succeed**; host `_INDEX.md` ids are exactly `['common-alpha']`, and the alpha mirror bytes equal the canonical skill.
- `a post-generation excluded row injected in real producer format is refused without publication` — the existing real-producer wrapper appends the actual `common-beta` row read from the canonical `skills/common/_INDEX.md` into the stage host index (no invented bullet format, no toy parser), plus a fixture hook journal entry proving the injection fired; the run must be refused with no publication and the active host index left byte-identical.

## 5. Fault injection now reaches the authorized rename

- First case: a real changed owned output is established (Alpha description edit) before the rename mock; the corrupted first rename is asserted to be the single applied file, its published bytes end with `CORRUPT`, and the receipt reports applied-but-unverified.
- Ledger case: compares canonical physical paths — `path.join(await fs.realpath(root), '.skills-lock.json')` against `path.resolve(to)` — so the `/var` vs `/private/var` alias cannot silently disable the hook. The corrupted ledger bytes are asserted as the observable applied effect. Production was not changed to fit the mock.

## 6. New R5 behavioral regressions (frozen public API only)

| Test name | Contract |
| --- | --- |
| `generation preserves an unrelated agent-owned active file and its ledger provenance` (R5-B1) | Previous valid lock plus an unselected `.cursor/skills/common/common-alpha/SKILL.md` file/entry and unrelated `sources`/`disclosed` metadata: a real publishing run keeps the active file bytes, its ledger entry and all unrelated provenance, while the changed Copilot output publishes and keeps its own entry. |
| `generation does not acquire ownership of an unowned equal-byte configured output` (R5-B2) | With an existing lock, the `.github/skills/common/common-beta/SKILL.md` entry is removed while its bytes already equal canonical: after a publishing run, no `entries`/`generation` authority appears for it, it is not published, and its bytes are unchanged. |
| `a producer dependency changed after candidate capture blocks all publication` (R5-C) | Through the real wrapper, `cli/src/capabilities/agentCapabilities.ts` in the active checkout is altered after staged generation; the run must be refused with no publication, destination bytes unchanged, and the marker provably present in the active dependency. Canonical-content drift coverage retained separately. |
| `a Git index-only change to a proved adopted path blocks publication` (R5-D) | A successful pinned-base adoption proof, then during real candidate generation only the Git index entry of an adopted path (`.github/skills/common/common-beta/SKILL.md`) is replaced (`git hash-object -w` + `update-index --cacheinfo`), leaving worktree bytes untouched; the run must be refused, publish nothing, and preserve the user's staged index entry (asserted by comparing the index blob against the base blob). |

All four use `runIsolatedGeneration`/`withEnv`/the real fixture and real producer resources only; no import of unimplemented functions, no new required options, no synthetic hashes, no new ledger shape.

## 7. Parent replay commands (NOT RUN by this worker)

```
rtk proxy node --import tsx --test scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "preserves an unrelated agent-owned active file" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "does not acquire ownership of an unowned equal-byte" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "producer dependency changed after candidate capture" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "Git index-only change to a proved adopted path" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "exclusion selection change" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "excluded row injected in real producer format" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "post-rename" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "apply publishes the changed consumer outputs" scripts/generation/isolated-stage.test.ts
```

## 8. Expected frozen-runtime classification (predictions, not observations)

- **Expected behavioral RED against the frozen runtime:** R5-B1 (staged ownership imported wholesale), R5-B2 (stage equal-byte adoption imported), R5-C (producer dependency absent from the inventory), R5-D (no index revalidation at publication).
- **Expected to pass on the frozen runtime (boundary controls, not RED):** both post-rename fault cases (the frozen publisher verifies readback and preserves partial receipts), row-injection refusal (parity validation already exists), workflow-absent refusal, drift/absent-destination refusals, attempt-id refusals, foreign-cwd refusal.
- **Genuinely undetermined until replayed:** the 11 adoption cases after the Git prerequisite fix (some may still fail for unresolved proof-transition reasons), and the exclusion-success case, whose outcome depends on whether the frozen host index drops the excluded id after the real producer regenerates it. Any failure there must be classified by received values, not assumed to be a production defect.
- **Setup risks to watch:** `git -C <fixture> hash-object -w`/`update-index` inside the stage (R5-D) and the row lookup in the canonical index (exclusion case) are fail-loud by construction — if they cannot run, that is a fixture/setup failure, not behavioral RED. The `t.mock.method` seam remains statically sound but unexecuted.

## 9. Not claimed

No PASS/FAIL is claimed for any test above, no RED is claimed to be observed, no original pre-implementation RED exists, and Phase1B (the four-contract production replacement) was not started. Production hashes are unchanged from the Phase0 bindings.

---

# PHASE1A corrective freeze (parse defect + R5-D timing)

**Status: PHASE1A FROZEN (corrected).** Task 1 not done; Phase1B not released.
Worker execution: **NOT RUN** — no tests, probes, `tsc`, build, lint, formatters, generators, root commands, commits or agents.

## Parent-observed parse failure — classified as setup, not behavioral RED

The parent static gate reported **TS1128 at `isolated-stage.test.ts:430`**: `assertRefusedWithoutEffects` closed at 429 and an extraneous standalone `}` remained at 430, a leftover from removing the duplicated `physicalRoot` helper. That is a **file-synthesis/setup defect**, not behavioral RED, and it carried no signal about production behavior.

Correction: the orphan brace was removed (the helper now ends at 429). All other changed declaration boundaries were re-inspected manually: `GENERATE_INDICES_WRAPPER`, `writeMinimalProducerTree`, `installIndicesWrapper`, `createFixtureRepo`, `populateFixtureRepo`, `withFixture`, `withEnv`, `git`, `commitFixtureBase`, `HookRecord`, `readHookJournal`, `prepareHookJournal`, `assertRefusedWithoutEffects`, and every modified `test(...)` block. No adjacent-`}` duplication remains.

## R5-D timing defect and its correction

Defect: `FIXTURE_GIT_REPO`/`FIXTURE_GIT_INDEX_PATH` act from the wrapper at the end of the staged producer child, with no phase gate. If the wrapper were part of the **base** commit, the pinned-base prior-producer proof would also execute the index mutation *before* its own initial Git checks, so a refusal could come from the proof rather than from missing publication-time revalidation — a false negative PASS.

Correction (no magic temp-name gate, no production API, no phase flag):

1. The base is still built by a real, **unwrapped** producer run: `withFixture({})` (no `mutateDuringIndices`) → successful apply → `commitFixtureBase(root)` commits the genuine `scripts/generate-indices.ts`.
2. `installIndicesWrapper(root)` runs **only after** the commit, in the current fixture, immediately before `runIsolatedGeneration({ adoptBase })`. The archived base therefore has no hook, so the proof cannot mutate anything; the hook can only fire during candidate generation, i.e. after the proof completed.
3. The test now proves non-vacuity with three independent observations: the fixture hook journal records exactly one `stage-index-only` entry (so the mutation really ran post-proof), the index blob differs from the base blob (staged-only change), and `git diff <base> -- <adopted path>` is empty (worktree bytes still match the recorded base, so the user's staged entry was not reset by a worktree write).
4. `assertRefusedWithoutEffects(result)` then requires refusal with no applied/verified file.

No other fixture commits a wrapper: every `commitFixtureBase` call site uses a plain fixture, and no test combines `commitFixtureBase` with `mutateDuringIndices`.

## Final state of this phase

| Path | Change | SHA256 |
| --- | --- | --- |
| `scripts/generation/isolated-stage.test.ts` | parse defect fixed; R5-D base/current-wrapper separation and journal/index/worktree assertions | `f9b3a73174722d3816b2575cadb9420719c3b7d25334150b7c74626fd025be8a` |
| `scripts/generation/isolated-stage.ts` | unchanged | `c75d1cde57f788d55d72745b6ccd3145dcc4b05832ab389ecadf82e3be5eb8f5` |
| `scripts/generation/index.ts` | unchanged | `bb71fb527da60a62e1d977dd77bf7b187ea6fa49fc3a42d98cfec8ceba7a5bb0` |

41 tests. Fixture Git dependency exclusion and the removal of incidental error-prose pins remain in force. R5-B1/B2/C controls unchanged from the previous section. Parent commands are unchanged:

```
rtk proxy node --import tsx --test scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "Git index-only change to a proved adopted path" scripts/generation/isolated-stage.test.ts
```

No PASS/FAIL, RED, or Node20 claim is made. Frozen pre-replacement archive `7e1aa065d887c1be4ea1477f78321263d7c53b4ac2fccb64faed6b07d0bdbbc0` remains immutable and is not affected by this test-only correction.



# Provider recovery — TESTS-ONLY FROZEN

**Status: TESTS-ONLY FROZEN.** This checkpoint does not complete Task 1 or release Phase1B. Worker verification: **NOT RUN** — no tests, probes, typechecks, builds, lint, formatters, generators, root commands, or commits.

Provider recovery context: DeepSeek was unavailable with observed DNS `ENOTFOUND`; this bounded continuation used the authorized Personal · Delivery fallback. The interrupted test file was read at its current identity, not restored from an older report.

## Recovery changes

- `scripts/generation/isolated-stage.test.ts` (SHA256 `4f891a74a70c352bfc52ef05ea7967fda63e042e21f9da3b6e54d5380abc7334`, 41 tests): the explicit-base adoption case now proves a changed workflow prompt against its prior bytes, checks the active generation entry's digest against published bytes, and checks the adoption proof's BASE, prompt digest, and archived before-bytes. Removed obsolete ownership assertions for unchanged Alpha LICENSE and `AGENTS.md`.
- R5-C `a producer dependency changed after candidate capture blocks all publication`: inspected in the current test; mutation evidence is asserted before refusal, followed by unchanged destination/no-effect assertions. No further change needed.
- R5-D now additionally verifies after refusal that the staged Git index blob identity remains unchanged.

Production remains frozen: `scripts/generation/isolated-stage.ts` SHA256 `c75d1cde57f788d55d72745b6ccd3145dcc4b05832ab389ecadf82e3be5eb8f5`; `scripts/generation/index.ts` SHA256 `bb71fb527da60a62e1d977dd77bf7b187ea6fa49fc3a42d98cfec8ceba7a5bb0`. Parent replay and semantic verification remain the next gate.

## Parent verification targets (NOT RUN by worker)

Existing focused adoption and R5 targets remain:

```text
rtk proxy node --import tsx --test --test-name-pattern "explicit base adoption proves producer bytes" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "producer dependency changed after candidate capture" scripts/generation/isolated-stage.test.ts
rtk proxy node --import tsx --test --test-name-pattern "Git index-only change to a proved adopted path" scripts/generation/isolated-stage.test.ts
```

No observed PASS/FAIL or behavioral RED is claimed. Task 1 remains incomplete; no production coordinator or metadata-scope implementation was started.

# Corrective freeze — workflow output uses CLI ownership

**Status: TESTS-ONLY CORRECTIVE FROZEN.** This does not complete Task 1 or release Phase1B. Worker verification: **NOT RUN** — no tests, probes, or commands.

Parent reported that the frozen replay's explicit-base-adoption positive failed because its assertion looked for a workflow prompt under `lock.generation.entries`; the runtime returned `lock.generation === undefined`. This is a test expectation defect, not evidence of a production defect. The other seven paired controls passed, and the parent reported zero owned semantic errors apart from three BASE-reproduced imported errors.

Correction in `scripts/generation/isolated-stage.test.ts`: the positive now asserts the changed prompt in `lock.entries` with the existing CLI ownership contract: `owner: 'workflow'`, `source: 'workflow:demo'`, `agent: 'copilot'`, and the digest of the published prompt. It retains the changed-output/prior-byte checks and verifies the adoption proof's BASE, prior prompt digest, and archived bytes. It does not assign generation ownership to unchanged `AGENTS.md` or LICENSE.

No production files or APIs changed. Parent will rerun only this corrected positive before deciding whether to release Phase1B. No PASS is claimed by this worker.

# Source-frozen setup correction — optional README in BASE snapshot

**Status: TEST-FIXTURE-ONLY FROZEN.** Task 1 remains incomplete; Phase1B remains unreleased. Worker verification: **NOT RUN** — no tests, probes, or commands.

Parent reported the frozen 41-test replay reached 36 passing controls, four expected R5 behavioral failures, and a README-metrics adoption setup failure: the pinned-base producer did not declare `README.md`. The fixture creates root `README.md` only for `includeMetricsReadme`, but `commitFixtureBase` omitted it from the Git pathspec, leaving it outside the archived BASE.

Correction in `scripts/generation/isolated-stage.test.ts`: `commitFixtureBase` now adds root `README.md` only when `fs.pathExists` and `fs.lstat(...).isFile()` both hold. Fixtures without a README do not pass a missing literal pathspec to Git; symlinks and non-regular README paths are not added. Existing node_modules exclusions and all production declaration/pristine guards remain unchanged.

No production behavior or tests were deleted. The absence-from-BASE negative remains untouched. Parent will rerun only the README-metrics positive; the sealed `frozen-foundation-suite-run-01.json` remains immutable. No PASS is claimed by this worker.
