# Task 1 Phase1B coordinator — independent corrective review round 2

## Verdict

- **Spec compliance: CHANGES REQUESTED for required regression qualification.** The production A–E corrections are addressed at source level, but two newly authored adoption controls assert the wrong contract/scenario. They cannot qualify the required positive/negative boundary as written.
- **Quality/security: CHANGES REQUESTED for those test defects.** No additional production Blocker/Major was established in this static corrective review. The findings below are verification defects, not evidence that the production coordinator must regain broad adoption authority or move host ownership into the generation namespace.
- **No root execution clearance.** Current parent fixture/semantic checks were reported running; this reviewer did not receive their result before writing this report. Source-level acceptance of the production changes is not a passing behavioral receipt.

Reviewed the actual frozen helper `scripts/generation/isolated-stage.ts` snapshot `70E6`, tests `7554`, CONTRIBUTING generation subsection `9959`, actual strict entrypoint `5CB5`, and package script `6452`. Read the correction brief and freeze amendment lines 53–76; retained the original Phase1B contracts, scoped metadata approval, prior review and attributed execution addendum. This report is the sole new artifact written. No implementation changes, commands, checks, probes, tests, generation, root effects, delegation, profile changes, or premium calls were performed.

## Remaining consequential findings — complete batch

### P1B-R2-A — Major verification defect: positive changed-mirror adoption asserts the forbidden ownership namespace

**Location:** `scripts/generation/isolated-stage.test.ts:675-685`, specifically `683`.

The positive unchanged-unmarked-AGENTS plus changed-mirror test reads:

`lock.generation.entries[mirrorPath].sha256`

Its `mirrorPath` is `.github/skills/common/common-alpha/SKILL.md`. Production deliberately classifies this as CLI-managed (`isolated-stage.ts:2206-2217`), writes the corresponding stage-qualified host entry to `entries`, and deletes any generation entry (`2524-2537`). On a successful correct publication, dereferencing this generation entry is invalid. Changing production to satisfy it would contradict the accepted ordinary CLI ownership contract.

**Bounded fix:** assert `lock.entries[mirrorPath]` has the expected real `owner: 'skill'`, category/skill/ref source, `agent: 'copilot'`, and exact published digest; assert the generation entry is absent. Retain all assertions that AGENTS bytes are unchanged, AGENTS acquires no ownership, and adoption proof includes the changed mirror but excludes AGENTS. Do not migrate the mirror into generation ownership to repair the test.

**Evidence limit:** static contradiction between the test assertion and the actual merge predicate/body. No runtime failure is claimed as independently observed.

### P1B-R2-B — Major verification defect: the replacement mixed-output negative still does not request an AGENTS replacement

**Location:** `scripts/generation/isolated-stage.test.ts:694-726`, especially setup `697-717` and refusal assertion `721-722`.

The scenario appends authored bytes after the pinned BASE AGENTS file, then appends text to the canonical Alpha skill body. It does not change the router's actual input determinants. `IndexGeneratorServiceImpl.assembleRouterIndex` (`cli/src/services/IndexGeneratorServiceImpl.ts:240-402`) builds its output from file-routing metadata, available category names, the MCP flag, and fixed protocol text; it does not consume skill body text. `MarkdownUtils.injectIndex` (`cli/src/services/utils/MarkdownUtils.ts:35-47`) preserves the authored suffix outside the markers and leaves an unmarked file unchanged.

Thus appending skill body text can require a mirror/metric update but does not establish a candidate-versus-active difference for AGENTS. The authored suffix itself is retained in the candidate. Demanding an AGENTS refusal for this unchanged unknown output recreates the no-op authority expectation that correction A explicitly removed. A test name saying “changed mixed” does not make the generated region change.

**Bounded fix:** keep a real authored AGENTS suffix that differs from BASE, and change an actual current router determinant, such as a real file-routing metadata mapping that changes a rendered router row. Preserve BASE configuration and the independently reconstructable old producer inputs. Establish that the real candidate requests a different generated AGENTS region, then require refusal/no publication for that genuinely changed mixed file whose current whole bytes lack the approved pristine-BASE proof. Keep the unchanged mixed positive as the complementary allowed case. Do not reintroduce proof for every unknown or weaken the no-publication assertion.

**Evidence limit:** source-based analysis of the test and actual producer/injection inputs, not an executed result. A parent failure on the refusal assertion would be a test-contract failure unless a separate production defect is established.

## Explicit dispositions of original A–E

| Finding | Source disposition | Evidence and residual qualification |
|---|---|---|
| **A: proof before changed set** | **Addressed in production source.** | Real phases/parity complete at `3298-3338`; exact changed paths at `3340-3351`; only `changedUnknownExisting` at `3385-3387` is passed to BASE proof at `3405-3425`. Unchanged unknowns do not acquire proof/ownership. The two new tests above still require correction before this boundary is behaviorally qualified. |
| **B: omitted configuration Git identities** | **Addressed in production source.** | `3210-3215` includes all configuration candidates with declared outputs and the lock. Every stable-state check reuses that invocation identity at `3258-3262`, retaining both `.skillsrc` and `.skillsrc.yaml` facts rather than rebaselining after proof. The new index-only configuration test `2328-2392` records the real child mutation, compares the staged blob, checks unchanged worktree/output/lock bytes, and preserves the foreign index state. Not executed by reviewer. |
| **C: own absent-host directory drift** | **Addressed at source level.** | All declared parents are inventoried at `1101-1107`. `ensureOutputDirectoryChain` (`2630-2664`) records only successful own mkdir effects and verified dev/inode identities. `assertOwnedSourceEffects` checks those identities and permitted children and exempts only exact absent-to-owned-directory transitions (`1132-1203`); immutable before-state is not overwritten. Cleanup only removes same-identity empty owned directories and reports retained paths (`2666-2714`, `3581-3593`). Candidate planning also declares rules when other planned outputs create their detection root (`717-734`). Whole-absent-Copilot test `1181-1214` names rule/workflow/specialist/index/mirror/resource targets before apply, then requires apply and passing check. Current execution pending. |
| **D: own publication temporary inventoried as foreign source** | **Addressed at source level.** | Publisher allocates an exclusive private directory under the destination parent on the same filesystem (`2815-2818`). It records exact directory/payload identities and expected digest, verifies both before exemption/rename (`2825-2863`, `1225-1260`), and passes only exact registered effects to inventory comparison (`1111-1222`). No suffix/glob/source-subtree filter was added. Cleanup verifies identity, payload shape and digest before unlink/rmdir (`2716-2773`), preserves foreign/unverified content, and returns cleanup failures in the primary error path (`2872-2897`). The foreign canonical-resource temp-looking sibling test `2194-2242` records actual post-producer injection, requires drift refusal, and preserves foreign bytes. Current execution pending. |
| **E: pnpm separator/usage failure** | **Addressed in fixture and documentation source.** | Public fixture invokes `spawn('pnpm', ['generate-indices', ...args])` (`1910-1915`), retaining stale-check → apply → passing-check receipt/parity/unknown-ownership assertions. Actual package script remains `tsx scripts/generation/index.ts`; strict entrypoint flags remain unchanged, with no root override/ignore-unknown/separator special case. CONTRIBUTING `217-228` now uses direct flags, including the adoption example. Actual pnpm qualification still depends on the parent's current run. |

## Safety and contract assessment

### No stage-authority or broad exemption introduced

Stage ownership remains candidate evidence; active authority still comes from matching previous ownership, safe absence, or independently reconstructed approved BASE proof for changed unknown existing outputs. Changed-set filtering precedes proof. No unchanged unknown publication or adoption is added by these corrections.

Own directory accounting is limited to actually created paths plus verified identities, not every planned directory or a fresh filesystem baseline. Foreign creation of an absent parent through an EEXIST path is not entered as an owned mkdir. Added declared-parent inventory guards its topology. The private temporary exemption is a lease over exact directory and payload paths, identities, contents, and digest, not recognition of a filename suffix. Unregistered resource additions still appear in the recursive canonical inventory.

### Source fields, ledger merge, and metadata scope retained

`persistVerifiedOwnership` still starts from previous entries/generation entries, changes only the passed changed-path set, preserves unrelated sources/registry/disclosed data, and overlays only applicable changed-output source keys (`2518-2572`). CLI-managed host paths retain `owner/source/agent` metadata, rather than being copied wholesale into the generation namespace. Ledger rename remains last, with the rename callback before readback (`2595-2600`); output rename is recorded immediately at `2863-2864`. Cleanup failure after an output rename does not erase that recorded effect. Verified paths remain separate from applied paths.

The metadata exception is unchanged: semantic nonmetric comparison; exact original bytes restored when metric values are unchanged; canonical serialization prerequisite only for actual metric changes; active baseline plus generated metric values used for composition (`2449-2482`, `159-253`). Scoped ownership remains exact-path category-token-metrics authority, not full-file source ownership. No accepted schema reopening or new scope was needed.

### Remaining boundaries

No new production Blocker/Major was established from the reviewed correction. This does not assert hostile filesystem operations are atomically prevented by host enforcement, nor does it waive genuinely unsupported changed mixed-file proof. No additional required current-root mixed path lacking authority was established without a candidate run; no such root run was authorized or performed. Correct the tests rather than infer that supported unknown no-ops require new user authorization.

## Verification limits and next action

- Current corrected complete suite and semantic checks: parent reported running; results not yet supplied to this review. No PASS inferred from freeze text or authored assertions.
- Prior execution remains exactly attributed: 49 cases / 39 PASS / 10 FAIL / 0 skipped / 97670.718083 ms, with eight self-temporary publication failures, a blocked post-rename ledger assertion, and a pnpm usage failure. Those results predate this correction and cannot qualify it.
- In particular, this review does not claim that previously stopped B1/B2 ledger or post-rename callbacks were exercised. Their current assertion-bearing results remain required.
- Accepted schema qualification remains separately scoped; unrelated Task 2–7 work was not reopened.
- Original preimplementation RED remains NOT RUN. Prior setup failures are not behavioral RED. Parent runtime evidence is Node 26.12.1, not Node 20 qualification.
- Refreshed file standards and audited consultation. MCP loaded rules remain the common architecture/security/best-practice/TDD rules, TypeScript, system-design principles and routed framework testing rules listed in round 1; router category coverage warnings remain diagnostics, not runtime evidence. Session cost requested; exact host usage/pricing unavailable.

**Next:** correct the two assertion/scenario defects without changing the now-addressed production authority model; parent must retain and report the complete corrected suite/public-pnpm and baseline-attributed semantic results, including previously blocked ledger cases. Re-review any production change separately. No root check/apply/adoption/publication clearance from this static report.

**FINAL — independent reviewer frozen after writing this report.**

## Post-FINAL parent execution addendum — complete round2 disposition

Parent agent `fa39e940-38ca-442b-8d6b-bbc2f95ae819` supplied message `669036bd-a464-4fdf-973a-51fdb14fb135` after the static report: **53 tests / 47 PASS / 6 FAIL / 0 skipped / 142940.311833 ms**, retained in parent run `bg46`. Parent reports semantic qualification still has the same three BASE-attributed imported diagnostics and no owned diagnostics; this remains an overall non-PASS semantic command, not an invented clean typecheck. This reviewer did not rerun or inspect execution beyond the attributed report; source locations below were checked read-only.

**Updated final verdict: spec and quality/security CHANGES REQUESTED, now including one observed production Major in addition to invalid regression expectations.** The earlier statement that no new production Major was established describes the preceding static review only; it is superseded by the supplied absent-host failure and verified producer/writer connection below. Prior source-level A/B/D/E dispositions stand subject to their actual scenario results. C's own-directory accounting is source-addressed, but its required end-to-end absent-host behavior is **not complete** because the specialist candidate is refused for a separate reason.

### Six failures classified — production versus test defects

1. **Test defect, P1B-R2-A confirmed:** positive unmarked-AGENTS/changed-mirror adoption dereferences `generation.entries[mirrorPath]` at test `683` and raises TypeError. The mirror belongs in ordinary `entries`. Preserve production CLI namespace, source, agent, and digest semantics.
2. **Test defect, P1B-R2-B confirmed:** changed-mixed AGENTS negative reaches `success=true` at refusal assertion `721`; appending an authored suffix and skill body text does not establish a generated router change. Correct the fixture's actual router inputs, not production unknown-output authority.
3. **Additional stale fixture expectation:** BASE-absent capabilities test `729-744` removes the path from the tracked BASE but leaves the current producer output byte-identical and changes no candidate determinant. It therefore requests no replacement. The changed-set contract permits leaving it unknown and untouched without proving its presence in BASE. To exercise the intended refusal, establish a real candidate-versus-active capability-document difference while keeping its absence from BASE; an active differing unknown document is a suitable bounded scenario. Retain parity and no-effects checks.
4. **Additional stale fixture expectation:** current-index-untracked mirror test `763-782` removes Alpha's index entry but makes no canonical/candidate change. It likewise requests no replacement and must not force proof merely because `--adopt-base` was supplied. Change the current canonical Alpha content so the candidate mirror differs, then require refusal on that changed unknown output's missing regular index authority and preserve the staged index deletion.
5. **Additional stale fixture expectation:** dirty/custom-overrides configuration test `985-1002` changes the config only to exclude Alpha and otherwise requests no output replacement. No old proof is needed for untouched outputs. Make a genuine candidate change to a still-selected, non-overridden output (for example Beta), so adoption proof is actually required; then verify the config/base mismatch refuses before effects and retains the modified config. Do not restore a global “all current config equals BASE” prerequisite for no-op invocations.
6. **Actual production Major, P1B-R2-C:** the whole-absent-host apply fails on `.github/copilot-agents/specialist-arch.instructions.md` lacking staged CLI ownership metadata. This is a valid absent-output scenario, not an invalid no-op authority expectation.

### P1B-R2-C — Major production fault: absent specialist creation is incorrectly contingent on a producer manifest entry

**Observed parent failure:** whole-absent-host apply reports `Staged host output ".github/copilot-agents/specialist-arch.instructions.md" lacks matching CLI ownership metadata.`

**Verified source cause:** `scripts/generate-indices.ts:419-424` invokes `SpecialistSyncService.syncSpecialists(repoRoot, agents)` without a managed writer. That API defaults to `new PassthroughWriter(rootDir)` (`cli/src/services/SpecialistSyncService.ts:124-129`). An absent specialist is created as actual transformed bytes, but this invocation does not add a corresponding ordinary manifest entry. Stage pre-seeding at `isolated-stage.ts:2399-2406` skips paths whose stage bytes are absent, so it cannot supply this missing initial entry. The unconditional changed-host entry guard at `3352-3365` then refuses the independently validated candidate before active absence/creation authority can be used. `persistVerifiedOwnership:2524-2537` has the same dependency and must remain consistent with the corrected flow.

**Bounded fix direction, not implementation authorization:** keep actual producer execution, transformed-content validation, active absence/drift checks, and the independent active authority gate. Establish deterministic CLI owner/source/agent metadata for the validated candidate through the existing producer/writer interface or the coordinator's exact plan-derived candidate metadata; do not treat a stage manifest's existence as the grant of active authority. Only merge ordinary CLI ownership for the authorized, published, verified changed path. No generation-namespace fallback, blanket trust of stage entries, phantom active adoption, or omitted specialist validation. Cover both new absent specialist creation and the existing edited/unknown specialist refusal boundaries.

The full-absent-host regression must reach successful apply, planned rule/workflow/specialist/index/resource publication, correct ordinary specialist ownership, and the subsequent passing check. A missing-stage-entry failure is not successful containment proof for that required supported path.

### Routing and clearance

The one B2 corrective follow-up has already been used. This report authorizes no further implementation attempt: parent must resolve the next eligible routing or explicit exception under the established policy rather than silently repeat the same route. Independent CLI checks/build were reported running separately; no outcomes or generator qualification are inferred from them.

Parent's 47 passing cases do not establish which previously blocked ledger callbacks/assertions ran without their specific traces/results. Preserve that limit. No original RED claim, Node 20 claim, host-enforcement claim, root generation/check/apply/adoption/publication clearance, source edit, or check execution is added here.

**FINAL UPDATED — complete six-failure classification recorded; reviewer frozen.**
