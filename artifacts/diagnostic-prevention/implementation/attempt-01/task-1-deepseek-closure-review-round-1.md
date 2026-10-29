# Task 1 DeepSeek bounded closure — independent review round 1

## Separate verdicts

- **Spec compliance: APPROVE, STATIC SOURCE REVIEW ONLY.** The prescribed specialist candidate-resolution correction and five fixture repairs are implemented within the bounded source contract. No remaining consequential spec defect was established by this review.
- **Quality/security: APPROVE, STATIC SOURCE REVIEW ONLY.** No new Blocker/Major was established. Missing specialist candidate identity is resolved without granting active replacement authority; present inconsistent entries and wrong transformed bytes still refuse.
- **Task 1 acceptance and root clearance: NOT GRANTED.** Parent full 55-case suite and semantic qualification were reported running; their current results were not supplied before this report. A static approval is not a passing test receipt, executed smoke, Node 20 qualification, or authorization for root check/apply/adoption/publication.

## Reviewed revision, scope, and rules

Read the complete `task-1-deepseek-closure-brief.md`, `advisor-decision-02.md`, current closure report, prior round2 review including the 53-case classification, and actual changed source/test sections with the relevant full producer/authority/publication paths. Source tool snapshots: helper `A61C`, tests `D842`. Worker-reported frozen SHA-256 identities are helper `9e9f94625382d68b0a609b156ae6ba101f2a33f1520e6929302f6caf4df8ed38` and tests `1b32c72b54abf16b0ab49cdae4ff4842596c25c9464722f96019db5d37b7c0b9`; this reviewer did not run a checksum command.

Only this new report was written. No source/test edits, commands, checks, tests, probes, generation, root effects, delegation, model/permission changes, premium use, or extra implementation retry were performed or authorized by this reviewer. Unrelated accepted slices and CLI schema/producers/lifecycle were not reopened.

Refreshed project file standards using MCP and audited consultation. Loaded rules remain: common architecture audit, best practices, security audit/standards, TDD, TypeScript language, system-design principles, and the routed Angular/Nest/Next testing rules recorded in prior reviews. MCP continues to report category coverage warnings; those diagnostics are not runtime evidence. Session-cost telemetry was requested; exact host tokens/pricing are unavailable.

## Production correction — load-bearing checks

### Planned specialist fallback follows exact byte validation

`validateGeneratedSurface` still computes each specialist export with the actual `SpecialistTransformer.transform` and compares its expected bytes (`isolated-stage.ts:1407-1428`). Candidate parity must return no errors before the coordinator constructs the changed-path set and resolves entries (`3358-3398`).

`resolveChangedCliStageEntry` (`2245-2261`) has two distinct branches:

1. A **present** entry is returned only if the existing `isTrustedCliOutput` predicate accepts owner/source/agent and its digest equals the candidate digest. An inconsistent present entry returns null; it is not replaced by a derived fallback.
2. A **missing** entry returns null unless the exact path belongs to `plan.specialistOutputs`. The sole fallback uses the existing `cliOutputOwnership(relPath, plan)` factory plus the already validated candidate digest. It is not extended to arbitrary mirrors, wrappers, rules, indexes, unplanned paths, or invented source labels.

Malformed present stage entries remain subject to the strict stage-lock reader before resolution. This is candidate identity repair for the passthrough specialist producer, not an active ownership import.

### One resolved value is reused through ordinary ownership persistence

`resolvedCliEntries` is invocation-local (`3124`). It is populated only for CLI-managed paths in the exact changed set after parity (`3382-3398`). The same map is supplied to `persistVerifiedOwnership` (`3548-3559`), which reads its resolved entry rather than re-deriving from the stage lock (`2555-2566`). Host output ownership remains ordinary `entries`; any generation entry for the changed host path is removed. The specialist identity is `owner: specialist`, `source: specialist:specialist-arch`, `agent: copilot`, and the exact candidate digest in the fixture.

The final merge still runs after each changed output has been published and read back. A failed publication exits before ownership merge. Previous unrelated entries, generation entries, registry, applicable source records, and disclosed data remain the merge baseline; no wholesale stage-ledger import was added.

### Active authority stays independent

The fallback does not participate in `unknownExisting` computation (`3233-3239`) and cannot remove a path from the active authorization set. The coordinator still computes `changedUnknownExisting`, obtains approved independent BASE proof only for that set, and refuses any unapproved changed existing output before publication (`3418-3469`). Captured absence remains creation authority, not a stage entry. Edited-owned output protection is unchanged. Equal-byte unknown paths never enter the changed-path resolution/merge set and acquire no ownership.

Accordingly, deriving specialist candidate metadata cannot itself authorize overwriting an unknown/edited active specialist. Generic active-authority enforcement remains in place for that path class. The existing explicit differing-unowned test uses a workflow prompt, not a specialist; this report does not mislabel it as an executed specialist-specific negative.

## Disposition of the six prior failures

| Prior failure | Current source/test disposition |
|---|---|
| Positive mirror adoption used generation namespace | **Addressed.** Test `681-721` asserts generation absence and exact ordinary owner/source/agent/published digest (`708-714`), while retaining unchanged/unclaimed unmarked AGENTS and proof-scope checks. |
| “Changed mixed AGENTS” never changed the router | **Addressed.** Test `723-791` retains an authored suffix differing from BASE, preserves BASE config, changes actual `metadata.file_routing.fixture_router` to common, and uses a post-real-producer observation hook. It requires actual staged row-token presence and a different staged digest before asserting refusal (`774-789`). The old skill-body-only surrogate and incidental refusal-wording requirement are gone. |
| BASE-absent capability document was unchanged | **Addressed.** Test `793-814` retains the recorded BASE omission and makes the active document explicitly stale, then requires no-effects refusal, exact stale-byte preservation, and no manifest. |
| Index-untracked mirror did not require replacement | **Addressed.** Test `832-858` retains the index removal and changes canonical Alpha content so a real mirror replacement is required, then preserves original mirror bytes and index deletion on refusal. |
| Dirty overrides config did not accompany a changed output | **Addressed.** Test `1060-1104` changes still-selected Beta while Alpha remains overridden, retaining user config bytes and both mirrors on refusal. No blanket no-op config/base prerequisite was introduced. |
| Whole absent host failed on missing specialist stage metadata | **Addressed at production source level; runtime qualification pending.** The bounded resolver supplies only missing planned specialist candidate identity. Full-absent-host test `1342-1385` retains all preplanned rule/workflow/specialist/index/mirror/resource assertions, adds exact ordinary specialist identity plus no generation fallback, and then requires a passing check. |

These are source dispositions, not claims that any current scenario passed. Prior parent receipt remains 53 tests / 47 PASS / 6 FAIL / 142940.311833 ms, from the earlier revision.

## New negative controls

- **Present inconsistent stage identity:** `1126-1157` changes the canonical specialist so its candidate truly changes. The real producer runs; the hook then writes a present stage entry with the exact staged digest but wrong specialist source (`152-165`). The test requires recorded injection before refusal and active-byte preservation. The setup isolates identity rejection rather than relying on an accidental digest mismatch.
- **Wrong specialist bytes:** `1159-1184` appends bytes to the actual staged export after the real producer, records the mutation, then requires no-effects refusal and active preservation. Exact transformer parity occurs before the fallback, so missing candidate identity cannot legitimize those wrong bytes.

These hooks mutate/observe actual temporary candidate products, not fake transformer outputs or source-wiring assertions. The fixture wrapper is installed after the pinned BASE for the mixed-router scenario, keeping old-producer reconstruction separate from the current observation mechanism. Parent must still confirm the assertions execute in the current full run; authored hook code is not observed evidence by itself.

## Retained A–E and cross-cutting protections

No closure change reorders candidate → exact changed set → independent authority → publication. Configuration candidates remain in the retained Git identity universe and are rechecked through effect boundaries (`3240-3292`). Source/producer/destination/lock drift guards remain in that stable-state path.

Exact owned-directory transitions and private same-filesystem publication-directory/payload leases remain. The publisher verifies expected digest and directory/file identity, accounts only registered self-effects, validates again before rename, records the rename immediately, and distinguishes cleanup/readback failure (`2844-2933`). No suffix-wide exemption, general source rebaseline, broad temp deletion, or authority waiver was introduced.

The metadata scope remains category-token-metrics only. Authored nonmetric fields, unchanged-byte preservation, canonical-format prerequisite for actual metric changes, and scoped descriptor persistence were not broadened. Pure/mixed BASE proof mechanisms and old-input reconstruction were not changed by this bounded closure. Public pnpm direct-flag spelling and strict entrypoint remain as previously corrected; no new root or ignore-unknown API was introduced.

## Non-blocking report/process notes

1. Closure report line 5 calls the approval a “first-exception.” Authoritative history supplied by parent is a **new explicitly selected bounded exception after the prior DeepSeek foundation attempt**. Treat the label as inaccurate history, not evidence of fresh automatic retry authority. This review grants no additional attempt.
2. The worker disclosed read-only listing/count/checksum/search commands despite its no-command brief. This is a disclosed process deviation, not behavioral verification. No generator/test/build execution follows from those inspections. This reviewer did not repeat them or infer successful runtime behavior from them.

Neither note establishes a production safety defect in the two changed files; neither is permission to alter history, approval controls, provider settings, or preserved receipts.

## Remaining acceptance gate

Parent must supply current frozen full-suite/public-path results and baseline-attributed semantic qualification. Previously stopped ledger/partial-rename assertions must not be claimed exercised merely from source inspection or a total passing count without their corresponding scenario results. The original preimplementation RED remains NOT RUN; prior version-bound failure evidence stays separately scoped. Node 26 evidence is not Node 20 evidence. Accepted CLI consumer/schema evidence is not a substitute for generator qualification.

**No consequential corrective source finding remains from this static review. No root generation/check/apply/adoption/publication clearance or automatic retry is granted. FINAL — reviewer frozen.**

## Parent-attributed qualification addendum — selected frozen closure

Received after the static FINAL from parent agent `fa39e940-38ca-442b-8d6b-bbc2f95ae819`, message `b09ab070-d6dd-4644-9d7f-34de8bcc4b33`. No checks were rerun by this reviewer.

- **Actual parent full temporary-fixture suite: 55 PASS / 0 FAIL / 0 skipped / 188517.221666 ms.** Qualification is bound to the selected closure helper `9e9f94625382d68b0a609b156ae6ba101f2a33f1520e6929302f6caf4df8ed38` and tests `1b32c72b54abf16b0ab49cdae4ff4842596c25c9464722f96019db5d37b7c0b9`, not a later formatted revision.
- Parent explicitly identifies exercised scenarios: whole-absent-host ordinary specialist ownership plus subsequent check; present wrong identity with the correct candidate digest; wrong transformed bytes; actual changed mixed-router refusal; inherited BASE/index/config protections; and A–E source/private-temporary/configuration drift controls. These are parent-observed behavioral results, no longer merely authored assertions or static predictions.
- **Strict semantic qualification:** no owned diagnostics; the same three independently BASE-attributed imported diagnostics remain; exit 2. This is not an overall clean typecheck PASS.
- Parent reports the formatting check requires Prettier for all three generation source files. Mechanical formatting is still to be settled by parent; this addendum neither authorizes edits nor extends the current revision-bound approval automatically to their eventual bytes.
- Parent reports accepted CLI 42-test/1282-test and consumer-03 evidence remain unchanged-byte scoped. Those independent receipts are not re-executed or broadened by this addendum.

The earlier pending-results statements describe the state when the static report was written; the attributed results above supply the subsequently received qualification for the stated frozen revision. They do not invent original preimplementation RED, Node 20 qualification, host enforcement, or a root run.

**Static spec/quality APPROVE stands for the reviewed frozen closure; parent-attributed temporary-fixture qualification is now recorded. Root generation/check/apply/adoption/publication clearance remains NOT GRANTED by this report. No further functional writer or retry is authorized. FINAL UPDATED — reviewer frozen.**
