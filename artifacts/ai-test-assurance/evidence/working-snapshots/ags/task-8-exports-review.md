# T8 prepared-export helper operational safety review

## Verdict: CHANGES REQUESTED — do not stage/apply this reviewed revision yet

Reviewed `.agent/sdd/ai-test-assurance/prepare-exports.mjs`, read snapshot `BD37` (832 lines), as a local administrative helper, not an adversarial evidence validator or attestation service. Findings below concern ordinary path mistakes, concurrent local edits, and accidentally modified/stale manifests. No hostile-producer threat model, signed manifests, sandbox redesign, or transactional installation is requested.

## Material findings

### [MAJOR] E1 — Stage isolation and no-symlink guards have physical-path holes
Evidence: helper 74–90, 99–125, 127–139, 142–166, 345–361.

Why: `validateStageDir` compares lexical resolved paths, not physical parent paths. An outside-looking stage path beneath a symlinked ancestor can resolve inside the active repository; the direct-symlink smoke does not cover that case. `assertNoSymlinkComponents` and stage validation call `existsSync` before `lstatSync`, so dangling symlinks are treated as absent. Separately, the repository copy deliberately preserves arbitrary symlinks at 159–162. A copied absolute link back to the active checkout can therefore be traversed by stage generator writes or the helper's recursive target cleanup. `getAllFiles` also silently omits symlink entries from evidence/source sets rather than rejecting them, while a symlink passed as its root is traversed before a path check.

Fix: Resolve and verify the stage's physical existing ancestor before creating it; ensure the resulting physical location is outside the active root. Use lstat-with-ENOENT handling to detect dangling links, and reject source/staged symlink entries before traversing/copying/deleting generator-visible trees. Treat explicitly provisioned dependency links as the only intentional exception. Check active/stage root identity and components before apply as well. This is a bounded filesystem guard fix, not a requirement to sandbox trusted generators.

### [MAJOR] E2 — Canonical source additions are not detected; source preservation is not rechecked after copy
Evidence: source snapshot 234–251; apply source check 601–614; final check 697–711.

Why: Apply only iterates `preSnapshot.sources_file_list`. A new canonical reference/script/asset added after staging does not appear in that old list, so old exports can be copied back despite source-set drift. Existing-file deletion/hash drift is checked, but the log's “file set” claim is false for additions. The final integrity check covers evidence only, not canonical skill/workflow source sets and hashes. The frozen-source operational contract needs both inventory and content preservation.

Fix: Re-enumerate the same two canonical skill roots and canonical workflow at apply, compare sorted sets and hashes to the pre-stage snapshot, and repeat source/evidence set+hash checks after copying. Do not rerun generators while any `.agent` writer is active; the evidence set guard correctly makes a report added during staging invalidate that stage.

### [MAJOR] E3 — New destinations can be adopted halfway through staging
Evidence: pre-stage destination inventory 253–276; manifest construction 442–473 and 478–499; apply checks 616–634 and 657–661.

Why: Existing skill destination files are snapshotted, but absent future skill-member destinations are not recorded as absent. Their `active_before_sha256` is sampled only after the generators finish (466), not from the pre-stage baseline. If a new destination reference is created by another local writer during generation, that later hash is adopted; apply then accepts and overwrites it. Missing workflow wrappers are explicitly recorded as null, so those already have the intended guard.

Fix: For each generated candidate destination, derive its expected pre-stage identity from the pre-stage destination map: recorded hash if present, otherwise null. Reject any current file where that pre-stage identity was absent. Never refresh the overwrite baseline from post-generation active bytes. Use the same frozen baseline for all apply checks.

### [MAJOR] E4 — Apply trusts the manifest's path and overwrite authority instead of enforcing the packaged allowlist
Evidence: packaged rules and allowlist are constructed at 37, 171–220 and 442–499; apply reads JSON at 569–575 and directly joins each `entry.path` at 642–645. Apply never calls `deriveAllowlist` or the packaged-file predicate.

Why: An accidental manifest edit or a manifest copied from a different staging operation can select a canonical source, eval transcript, unrelated active file, or `../` path. Manifest-owned hashes then authorize reading/writing that path. `assertNoSymlinkComponents` does not reject `..` or enforce containment. Existing snapshot checks only prove that canonical/evidence bytes were unchanged before the write; a canonical source selected by the manifest can be overwritten afterward, and the final check covers evidence only. This defeats the helper's narrow-copy administrative safety promise without requiring any hostile input.

Fix: At apply, independently derive the exact configured-host skill roots and approved workflow wrapper paths; accept only normalized contained relative paths satisfying the packaged predicate under those roots or an exact wrapper match. Validate all entries and bind them to the selected stage/repository/pre-snapshot before any copy. Compare destination identities to the pre-stage snapshot, not manifest-supplied authority; reject duplicate/out-of-scope paths and unknown copy targets before opening their files. Preflight every planned staged hash and destination condition before the first write, then retain immediate per-file checks. No signatures or general schema framework are needed.

### [MAJOR] E5 — Staged canonical mutations are logged as collateral instead of aborting
Evidence: active source snapshot at 234–251; generator execution at 369–421; presence-only generated-output checks at 423–436; collateral inventory at 502–535.

Why: The helper never verifies that the staged copies of canonical target skills and `.agents/workflows/test-loop.md` remain identical to their frozen active source bytes. Any generator rewrite of those inputs is merely listed as collateral, while exports derived from those altered inputs remain eligible for apply. The active originals may remain untouched, yet the exported guidance no longer has proven parity with the approved canonical input.

Fix: Before accepting a stage manifest, compare staged canonical target input sets/hashes and the workflow bytes against the pre-stage source snapshot, and abort on changes. Record ordinary generated collateral separately; do not treat changed canonical inputs as acceptable collateral. This does not require copying all generated collateral back.

## Checks that are present / bounded nonblocking concerns

- `runStage` invokes generators with `cwd: stageDir` (382–388, 406–412), excludes `.agent`/`.git`/artifacts from the initial copy, uses finite subprocess timeouts, and removes stale target exports only in the nominal stage tree. E1 must hold before those lexical stage locations establish physical isolation.
- `runApply` checks active evidence SET+hash before copy (581–599) and after copy (697–711). Existing destination hashes, per-file staged hashes, and immediate active-file hashes are checked, and unchanged destinations are not rewritten. These useful checks do not replace E2–E4.
- The narrow `.skillsrc` structure at 330–343 matches the canonical generator's actual consumer: `scripts/generate-indices.ts:337–345` filters workflow arrays, and 422–435 reads category `include` lists. The active configuration currently lists copilot, antigravity, codex, and claude; all three noncanonical wrappers at 210–214 are appropriate for that inventory. For reuse under a different host list, filter wrappers by that list instead of always requiring all three.
- Linking `node_modules` at 315–325 does not make dependencies OS-level read-only. Describe them as reused dependencies under a no-write operational rule unless the host enforces read-only access; no hostile-generator sandbox requirement is inferred here.
- Canonical `.agents/workflows/test-loop.md` is excluded from wrapper copyback and checked for presence in stage. Active `.skillsrc` is not rewritten. The source checks should bind active selection configuration as well if configuration is allowed to change between stage and apply.
- Collateral enumeration reads the broader staged/active trees to describe generator changes; that is distinct from authorizing collateral copyback. Do not claim the helper reads only the copyback allowlist. Do not widen copyback to indices/ownership locks without the parent's separate allowlist decision.

## Evidence and limits

The parent supplied guard smoke evidence; I read `.agent/sdd/ai-test-assurance/receipts/T8-export-guards.json:1–13` and `.log:1–8`. They report same-root, lexically inside-root, nonempty-temp, and direct symlink-stage rejection before snapshot/generator execution. The receipt records process status 0 and output SHA-256 `bf48205b737caa54eb12f5dc0c277e657da6b91cb784068303f010af5ec1d7d6`. This is parent-run evidence, not my execution, and does not cover dangling links, symlink ancestors, source additions, newly appearing destinations, or apply allowlist enforcement.

No checks, generators, tests, builds, lint, formatters, commits, source edits, or delegation were run for this slice. Canonical generation remains unexecuted at the supplied checkpoint. Findings are static code-path evidence, not executed reproductions. Parent must independently smoke the corrected guards before actual staging, wait for all evidence writers to stop, and verify integrated export parity afterward.

Skills: `ags-generator-safety`, `sdd-evidence-preservation`, project `common-code-review`, `common-documentation`, security review lenses, `ags-evidence-status-wording`, plus MCP-routed TypeScript and common baseline rules. The final MCP audit reported an `.mjs` routing gap; `skills/javascript/_INDEX.md` and `javascript-language/SKILL.md` were subsequently loaded directly. Its NestJS/Next.js/React/Angular warnings are extension-level routing noise for a Node generator script, not applicable framework omissions. Cost: host usage/prices unavailable; no estimate claimed.

## Revision 2 independent rereview — APPROVE, source-review scope only

This verdict supersedes the initial CHANGES REQUESTED verdict for the corrected helper bytes below. The original E1–E5 findings remain historical evidence, not findings against the new revision.

### Revision binding and method

- Fresh observed SHA-256: `b93ac1032c8ce518e2aedeb5337c0bb0f8483f45f3e4df60343b5535ad0fa8fe`.
- Source read snapshot: `8BDB`, `.agent/sdd/ai-test-assurance/prepare-exports.mjs`, 1276 lines.
- Binding command only: `rtk proxy shasum -a 256 .agent/sdd/ai-test-assurance/prepare-exports.mjs`.
- Read the settled revision-2 worker report (`1EED`) for scope/provenance, not as independent execution proof. Its disclosed synthetic probes, syntax/help commands, and success claims do not substitute for parent-owned checks.
- No generators, checks, probes, tests, builds, formatters, or source edits were run by this reviewer. Only checksum calculation and source reading were performed; this review appendix is the only changed artifact.

### E1–E5 disposition

| Finding | Source evidence in revision 2 | Independent disposition |
| --- | --- | --- |
| E1: physical isolation / symlinks | `lstatOrNull` 109–116; component guard 141–163; nearest-existing physical resolution 169–189; stage validation 209–253; strict inventory 258–280; copy refusal 305–326; dependency-link inventory 637–665; apply physical-root checks 877–899 | Corrected at source level. Dangling links are no longer treated as absence; stage operations use the physically resolved outside root; arbitrary copied links are refused; only explicitly provisioned dependency links are allowed before generators. |
| E2: source set additions / post-copy preservation | `captureCanonicalSources` 414–445; strict evidence inventory 447–464; apply freshly enumerates sources/evidence at 1000–1017 and repeats both at 1124–1139 | Corrected at source level. Source additions are included in exact sorted-set comparison, and preservation is checked after copy rather than inferred from a pre-write check alone. |
| E3: adopting new destinations mid-stage | complete destination root/file state 471–513; pre-stage identity 519–531; stage copy-list baseline 780–817; apply destination inventory 1019–1033 and preflight 1044–1080 | Corrected at source level. In-scope paths absent from the frozen pre-stage inventory resolve to null; appearance is rejected, not adopted. Existing-file hashes also come from the pre-stage snapshot. |
| E4: manifest authority / copy allowlist | configured-host derivation 350–386; normalized path classification 121–134, 392–411; apply repository/stage/snapshot/config bindings 877–950; manifest path/hash validation 953–975; independent stage enumeration and exact set/hash comparison 978–998; all-destination preflight 1044–1080 | Corrected at source level. Manifest entries no longer grant membership or overwrite authority. Paths must match independently derived roots/packaged predicates or exact wrappers; omissions/duplicates/unscoped entries are rejected; every planned entry is checked before the write loop. |
| E5: staged canonical mutations | post-generation staged source set/hash check 763–771; apply repeats staged canonical set/hash check 1035–1042 | Corrected at source level. Mutated canonical target inputs/workflow cannot merely be accepted as descriptive collateral. |

No remaining material error found within the stipulated local administrative helper scope. This approval assumes the parent's explicit freeze: no active evidence, source, destination, or configuration writers during actual stage/apply. It does not claim protection against a malicious process racing checks and writes, a sandbox, signed provenance, or OS-enforced read-only dependencies. The revised helper correctly labels dependency links writable-through-the-link at 21–25 and in its manifest/receipt.

The narrowed category `include` objects and workflow array at 667–677 retain the previously checked canonical-generator shape. Wrapper membership is now configuration-derived rather than unconditionally requiring three hosts. Active canonical workflow, active `.skillsrc`, ownership lockfiles, and descriptive collateral are not authorized copyback targets.

### Actual exported functions for parent-owned negative controls

The following are source-observed exports, not inferred test APIs:

| Function | Signature / use |
| --- | --- |
| `normalizeManifestPath` | `(raw, label)`; absolute/traversal/empty path rejection |
| `assertNoSymlinkComponents` | `(baseDir, relPath)`; live/dangling component rejection |
| `realPathOfNearestExisting` | `(p)`; resolves existing ancestors |
| `validateStageDir` | `(stageDir, repoRoot)`; returns `{realRepo, realStage}` |
| `copyDirectoryExcluding` | `(src, dest, excludes = [])`; refuses copied symlinks/special entries |
| `collectSymlinks` | `(rootAbs)`; lists links without following them |
| `deriveAllowlist` | `(skillsrc)`; returns `{configuredAgents, skillDirs, workflowWrappers, allPaths}` |
| `classifyAllowlistedPath` | `(rawPath, derived)`; independently rejects out-of-scope/unpackaged paths |
| `captureCanonicalSources` | `(baseDir)`; returns `{files, hashes}` |
| `captureEvidence` | `(baseDir)`; returns `{files, hashes}` |
| `captureDestinationsInventory` | `(baseDir, derived)`; returns `{rootStates, files, hashes}` |
| `preStageDestinationIdentity` | `(preSnapshot, relPath)`; returns `{known, hash}` |
| `enumerateStagedAllowlist` | `(stageDirReal, derived, {withBytes = false} = {})`; returns sorted packaged entries |
| `runStage` | `({repoRoot, stageDir, snapshotOutPath, logsDir})`; **runs generators**, not suitable for a no-generator guard probe except rejection paths guaranteed to stop before generation |
| `runApply` | `({repoRoot, stageDir, snapshotInPath, receiptOutPath})`; use isolated synthetic roots for negative apply controls, never the active checkout |

Suggested parent-owned negatives remain: physical ancestor alias into the repo; direct/dangling links; copied symlink back to active; canonical source addition/deletion/content drift; pre-stage-absent destination appearing later; manifest traversal/canonical/unpackaged/out-of-scope/duplicate/omitted entries; later-entry hash corruption rejected before earlier writes; staged canonical source/workflow mutation; swapped snapshot/config/repository bindings. Parent should independently observe no destination writes on rejection, then actual stage/apply/export parity only after every `.agent` writer has stopped. Writing this appendix changes the evidence set, so any stage captured before this append would be invalid and must not be applied.

### Acceptance boundary and audit

Runtime guard behavior, successful canonical generation, real exported-byte parity, index coverage, and actual apply remain unverified by this rereview and belong to the parent. The worker's probes are disclosed but not accepted as independent proof. No conclusion about integrated T8 completion, remote CI, release, pilot effectiveness, or blocking-policy activation follows.

Reused loaded `ags-generator-safety`, `sdd-evidence-preservation`, `common-code-review`, security/evidence wording rules, and directly loaded JavaScript language rules. MCP file routing returned no tier-eligible `.mjs` match; its coverage warning does not negate the separately read `skills/javascript/javascript-language/SKILL.md`. Compliance audit was called. Host usage/pricing remains unavailable; no cost claim.

## Actual export/runtime evidence review — APPROVE, bounded export checkpoint

This appendix advances the source-only approval with parent-executed runtime evidence. No material inconsistency found between the reviewed helper's intended guards, actual stage/apply records, and parent parity logic. Full T8 acceptance still waits for the final integrated CLI-to-validator smoke after TestGuard T3 freeze.

### Evidence inspected and attribution

- `artifacts/ai-test-assurance/evidence/MANIFEST.json` (`8611`): metadata identifies local-untrusted documentary preservation, dirty worktrees, and per-entry source/artifact SHA-256 plus identical flags. A read-only JSON projection reports **191 entries, 4,559,475 bytes, all recorded source/artifact hashes equal and identical=true**. This is manifest inspection, not this reviewer's rehash of all archived files.
- `receipts/T8-actual-exports.json` (`20B3`) and `.log` (`EAAC`) under the task evidence directory: parent invoked the reviewed helper with `--all`; process status 0. Recorded output SHA-256 `b00ac08005a008ff88be2eba847ef1e8b005f7c8f60c24a1a49eec99fd131736`.
- Durable `export-receipt.json` (`96ED`) and `pre-export-snapshot.json` (`B432`): receipt records **67 allowlisted files, 23 written, 44 unchanged**, the four configured hosts, eight skill roots, three noncanonical workflow wrappers, canonical workflow exclusion, pre-snapshot SHA-256 `33b7bad25d0cbb458a7643f8b89466d45b2d3c33dbbed0b9ea2bfdcd7bbd14f0`, and evidence/canonical preservation=true.
- Stage manifest (`BB58`) at `/private/var/folders/bk/6qfpqsgs4vj31vdb4b0yq_f80000gp/T/ags-exports-stage-4crZz2/stage-manifest.json`: matching repository/stage/config/snapshot bindings; both generator exit codes 0; 67-copy frozen inventory.
- Both durable generator logs were read (`generate-indices.log#8600`, `generate-capabilities-doc.log#DD81`). Their command CWD is the disposable physical stage, not active checkout; each ends with exit 0 and empty stderr/error sections. Generated indices/router/specialist collateral are stage outputs, not evidence of authorized active copyback.
- Parent parity script `.agent/sdd/ai-test-assurance/export-parity.cjs#D8DD:1–11` was read, not executed. Every receipt-listed file is compared byte-for-byte active versus stage and against the receipt SHA. Its additional canonical-resource comparison selects references/scripts/assets beneath the two target packages. It also rejects an active `.skills-lock.json`.
- `receipts/T8-export-parity-resources.json#837E` and `.log#3653`: parent-run process status 0, **67 exports compared; 48 canonical resource instances compared**, 23 written/44 unchanged, active ownership lock absent. Recorded output SHA-256 `d4dbe2edf5be704a4dbaeb8de4d75d103364b6e7ccb9409bba82813ec1f8a0bd`.

### Preservation and parity interpretation

The actual helper log shows physical isolation, pre-stage snapshot, stage-only generator execution, staged canonical validation, independent apply inventory checks, all-entry preflight, and post-copy evidence/canonical validation before successful receipt emission. Under the reviewed helper code, those checks compare source/evidence **sets and hashes**, not just file counts. The receipt and logs therefore support preservation at the execution checkpoint; the parent parity script separately proves all 67 copied/unchanged destinations match their staged/receipt bytes.

The parity script's `evidence_preserved` and `canonical_sources_preserved` assertions consume the helper receipt flags; they are **not a second independent re-enumeration of all evidence/canonical files**. Independence applies to export-byte/resource comparisons and ownership-lock absence. Preservation evidence comes from the reviewed helper's executed pre/post checks and the earlier external archive manifest. This distinction avoids double-counting the same preservation assertion.

The initial parent parity log (`receipts/T8-export-parity.log#F570`) remains a real failed run: it attempted `skills/common/common-tdd/LICENSE` and raised ENOENT. The correction limits only the *extra canonical-resource comparison* to references/scripts/assets. It retains active==stage==receipt-SHA checks for **all 67 entries, including LICENSE files**, so it does not weaken the exported-file parity contract. No product/helper/generator edit was needed for this harness correction.

No active ownership lock was copied. No category indices were copied; consequently there is **no index population/coverage claim**. Stage-generated collateral remains descriptive and excluded from active copyback. Writable dependency-link provenance is explicit, not OS-read-only enforcement.

### Final boundary

Approval covers this actual guarded export, bounded parity, and preservation checkpoint only. Parent states all AGS canonical/evidence writers were settled before `--all`; disjoint ongoing TestGuard correction does not itself change the AGS source/evidence snapshot. This appendix is a later evidence update, not a retroactive part of the pre-export archive/snapshot. Refresh/archive it separately as final documentary evidence; do not rerun or reapply the old stage merely to include the appendix.

No generators, checks, parity reruns, shell commands, probes, or source edits were performed in this evidence-review pass. Only receipts/logs/manifests/parity logic were read and this appendix written. Compliance audit called; previously loaded generator/evidence/review rules reused. Local-untrusted limits remain; no remote CI, final integrated T8 acceptance, release, blocking-policy activation, T7 execution, or production-effectiveness claim is supplied.
