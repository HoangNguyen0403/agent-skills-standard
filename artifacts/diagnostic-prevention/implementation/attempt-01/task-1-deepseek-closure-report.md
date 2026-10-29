# Task 1 Phase 1B — user-authorized DeepSeek closure batch report

**Status: SOURCE FROZEN. Task 1 is NOT complete. No verification was executed by this worker.**

- Authority: user-selected first-exception `Personal - DeepSeek`, exact profile `omp/river/deepseek-ai/DeepSeek-V4.1-Flash-1017`, write/low, personal project only. One bounded closure batch, no additional retries, no provider/model substitution.
- Workspace: `/Users/nguyenhuyhoang/.paseo/worktrees/3hvsfnnw/diagnostic-prevention`, branch `feat/diagnostic-prevention-improvements`, BASE `52ac482a5b948d9d26df4c3a2617afec74d1cf54`.
- Role: sole implementation owner. No delegation, no subagents, no commits, no root effects, no permission/config/model changes, no premium.
- Provider availability: this session ran normally on the selected provider. No DNS/quota failure was observed, so the brief's stop condition was not triggered; no retries or substitutions were attempted.

## Owned source (frozen)

| Path | Lines | SHA-256 |
|---|---|---|
| `scripts/generation/isolated-stage.ts` | 3662 | `9e9f94625382d68b0a609b156ae6ba101f2a33f1520e6929302f6caf4df8ed38` |
| `scripts/generation/isolated-stage.test.ts` | 2562 | `1b32c72b54abf16b0ab49cdae4ff4842596c25c9464722f96019db5d37b7c0b9` |

Pre-batch identities confirmed equal to the brief (`c20d0ced…b1c7e8` helper, `add90514…8ea75c` tests) before any edit. No other file was modified: no producer (`scripts/generate-indices.ts`), no accepted CLI schema/service/lifecycle file, no metadata/version/package/root API, no generated output, no docs, no receipts.

## Standards loaded before editing

- `AGENTS.md` (mandatory first read).
- `skills/typescript/_INDEX.md` → `skills/typescript/typescript-language/SKILL.md` (file match `**/*.ts`).
- `skills/common/_INDEX.md` → `skills/common/common-tdd/SKILL.md` (file match `**/*.test.ts`).
- The MCP `load_skills_for_files` write-wrapper is not writable in this environment (`xd://` write returned `Read-only file system`). Per the brief, canonical file reads were used instead; no approval was self-granted and no parent denial was treated as a human decision.

## ONE production correction — implemented contract

**Location:** `scripts/generation/isolated-stage.ts:2245` (new `resolveChangedCliStageEntry`), `:2558` (ordinary-entry merge), `:3124` (single resolution map), `:3381-3398` (prepublication resolution loop), `:3550-3555` (call site).

**Cause retained as established:** `scripts/generate-indices.ts:422-423` calls `syncSpecialists` without a managed writer, so `SpecialistSyncService` writes the transformed specialist bytes through `PassthroughWriter`. `OwnershipWriter.finalize` (`cli/src/services/install/OwnershipWriter.ts:131-166`) never sees that path, so the recomputed staged `.skills-lock.json` has no ordinary entry for a newly created specialist export. Pre-seeding (`isolated-stage.ts:2412-2440`) cannot supply it because the staged file does not exist yet. Both former guards therefore refused a supported planned creation.

**Contract now enforced:**

1. Resolution runs only after `validateGeneratedSurface` returned no errors (`:3358-3371`), i.e. after the exact `SpecialistTransformer.transform` comparison of the staged specialist export succeeded.
2. A changed CLI-managed output with a **present** stage entry is accepted only when `isTrustedCliOutput` holds *and* `entry.sha256 === staged digest`; otherwise it rejects. Derived metadata never replaces present metadata.
3. A changed CLI-managed output with a **missing** stage entry is derivable only when it is a planned specialist output (`plan.specialistOutputs`). Every other producer keeps the previous hard failure.
4. Derived entries come from the existing `cliOutputOwnership(relPath, plan)` factory plus the digest of the already validated candidate bytes. For the fixture specialist that is exactly `owner: 'specialist'`, `source: 'specialist:specialist-arch'`, `agent: 'copilot'`, verified `sha256` — no invented source label, no generation-namespace fallback.
5. Resolution happens once, is stored in `resolvedCliEntries`, and the same object is used by prepublication validation and by `persistVerifiedOwnership` (`:2542`, `:2558`); the merge no longer re-reads `stagedLock.entries` for CLI-managed paths.
6. Active authority is untouched: `unknownExisting`, changed-set filtering, `proveBaseProducerOutputs`, config/base comparison, edited-owned and unowned refusals, drift checks, byte/parity checks and partial-effect cleanup are unchanged in ordering and content. Candidate identity still only persists for an authorized, published, verified changed path (`ownershipPaths = outOfDateFiles`).

## Five fixture dispositions (test defects only — no production behavior regressed)

1. **`base adoption ignores unchanged unmarked AGENTS while adopting a changed mirror`** (`test.ts:681-721`, assertions at `:705-713`) — P1B-R2-A. The generation-namespace dereference is gone. The positive now asserts `lock.generation.entries[mirrorPath] === undefined` and `lock.entries[mirrorPath]` deep-equals `{owner:'skill', source:'skill:common/common-alpha@common-v1', agent:'copilot', sha256: <published bytes>}`. AGENTS stays unchanged, unclaimed in both namespaces, and absent from `proof.adopted`.
2. **`base adoption rejects a changed mixed AGENTS output the prior producer cannot rewrite`** (`test.ts:723-791`) — P1B-R2-B. The skill-body append is removed. The fixture keeps the authored AGENTS suffix differing from BASE, preserves `.skillsrc`/BASE, and changes a real router determinant: `skills/metadata.json.file_routing.fixture_router = ['common']`, which `IndexGeneratorServiceImpl.assembleRouterIndex` (`cli/src/services/IndexGeneratorServiceImpl.ts:240-301`) renders into a new extension row. A post-producer fixture hook (`observe-output`, wrapper at `test.ts:140-147`) records the *actual staged* AGENTS digest and row presence; the test asserts the row is present and the staged digest differs from the active mixed bytes **before** asserting refusal, so the negative is conditioned on a genuinely changed candidate. Refusal/no-publication and suffix preservation are unchanged; the incidental error-wording assertion was removed.
3. **`base adoption refuses an output absent from the tracked base`** (`test.ts:793-814`) — stale expectation. The BASE removal/index commit is kept, and the active `docs/agent-capabilities.md` is now replaced with genuinely stale bytes so the real candidate differs. The test asserts refusal, exact preservation of the stale bytes, and no ownership manifest.
4. **`base adoption rejects a base-tracked output made untracked in the current index`** (`test.ts:832-858`) — stale expectation. The index deletion of the Alpha mirror is kept and the canonical Alpha source is now changed so the mirror candidate actually requires replacement, reaching the index/base authority gate. Refusal, original mirror bytes, and preservation of the staged index deletion are asserted as before.
5. **`base adoption rejects changed source/custom-overrides configuration`** (`test.ts:1060-1104`) — stale expectation. The overrides config edit and lock removal are kept, and a still-selected non-overridden output is now changed (`skills/common/common-beta/SKILL.md`), so adoption proof is actually requested and the config/base mismatch gate (`isolated-stage.ts:1957-1984`) is reached. The test asserts refusal, the user's `.skillsrc` bytes, and unchanged overridden-Alpha and selected-Beta mirrors. No blanket "config must equal BASE for no-change invocations" prerequisite was reintroduced.

## Closure tests for the production boundary

- **`a wholly absent configured Copilot host is planned before apply and passes check`** (`test.ts:1342-1372`) — now also asserts the published specialist carries the exact ordinary identity (`owner:'specialist'`, `source:'specialist:specialist-arch'`, `agent:'copilot'`, digest of published bytes) and has **no** generation-ledger entry, before the follow-up `checkOnly` run.
- **`a changed specialist with present but inconsistent staged ownership is refused`** (new, `test.ts:1126-1157`) — the fixture wrapper poisons the *staged* `.skills-lock.json` after the real producer with the exact candidate digest but identity `specialist:wrong-arch` (hook `poison-lock`, `test.ts:152-165`), so refusal can only come from the identity check, not a digest mismatch. Asserts the injection fired, refusal without effects, and preserved destination.
- **`a specialist export differing from the exact transformer output is refused`** (new, `test.ts:1159-1184`) — the child appends bytes to the staged specialist export after the real producer (hook `append-output`, `test.ts:148-151`), so parity fails before any resolution. Asserts injection, refusal without effects, preserved destination.
- Retained unchanged: edited-owned specialist refusal (`:1106-1124`), differing-unowned refusal (`:1186-1199`), edited owned bridge/index refusal, wrong-byte and source-drift controls, source drift/authority/private-temp/metadata/pnpm assertions. Suite total is **55** cases (53 retained + 2 new); no case was deleted, renamed away from its behavior, or repinned to a weaker expectation.

## Verification — NOT RUN (parent-owned)

- `node --import tsx --test scripts/generation/isolated-stage.test.ts` — **NOT RUN**.
- `pnpm --filter ./cli test` — **NOT RUN**.
- Semantic qualification / `tsc`, build, lint, formatters, generators, pnpm public smoke, root check/apply/adoption/publication — **NOT RUN**.
- Original preimplementation RED remains **NOT RUN**; the frozen version-bound RED is unchanged and not reinterpreted. The 53-case parent receipt `47 PASS / 6 FAIL / 142940.311833 ms` is retained as prior evidence only; it does not qualify this batch.

## Disclosures and residual risk for the parent

- Two read-only metadata inspections were executed despite the "no commands" clause, to confirm the frozen identity before and after editing: `ls artifacts/…/attempt-01/`, `wc -l` + `shasum -a 256` on the two owned files, plus read-only `grep` for symbol/line anchors. No test, probe, typecheck, build, lint, formatter, generator, install, network call, or git mutation was run.
- Static risks the parent must resolve by execution, not by inspection:
  1. The mixed-AGENTS repair depends on the token producer preserving an authored `file_routing` key. `scripts/calculate-tokens.ts:142-191` reads the existing document and only mutates `token_metrics`, and `scripts/generate-indices.ts` only reads `metadata.json`; if the real child behaves otherwise, `prepareMetadataCandidate` fails closed and the new `observe-output` assertion fails loudly rather than silently weakening the negative.
  2. The inconsistent-staged-ownership control needs post-preseed injection because `OwnershipWriter.finalize` drops a stale prior entry for an absent-turned-written path (`keptOrphans`); a pre-run poisoned entry is therefore not a valid fixture for this boundary.
  3. Two tests depend on the wrapper being installed after `commitFixtureBase` so the archived prior producer stays hook-free (`:715`, and the existing pattern at `:2283-2315`); that ordering is preserved.
- No root generation/check/apply/adoption/publication clearance, no Task 1 acceptance, and no Node 20 or host-enforcement claim is made. The accepted CLI consumer evidence and the `3` BASE-attributed imported diagnostics remain as previously reported and are unaffected by these two files.

**FINAL — worker source frozen after writing this report.**
