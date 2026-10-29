# Native exact restoration procedure — independent review round 1

## Scoped decision

- **Spec compliance: APPROVE CONDITIONALLY for the exact parent-operated procedure and guards below.** Native worktree-only restoration is compatible with the recorded 15-path conditions and isolated qualification. It is a mechanism substitution within the existing user-approved scope, not a new force/adoption/rollback authority.
- **Quality/security: APPROVE CONDITIONALLY under the stated cooperating-writer model.** No consequential defect requiring another custom operator/source retry was established. The concrete native quarantine primitive supplied during review closes the procedure's initially unspecified move-command prerequisite, subject to its exact absent-child and same-filesystem guards.
- **Actual restoration/quarantine: NOT OBSERVED, NOT claimed PASS.** Fresh live preconditions remain mandatory before each command. Parent owns all execution, state comparisons, effect evidence, SDD verification, and any later R1 release. This report neither runs a command nor releases R1.

This decision covers `root-native-restoration-procedure-01.md` read snapshot `1B49` plus the exact quarantine command/qualification supplied in parent message `7644f41e-82ce-4aa5-9628-daee7e3cdd0d`. The custom operator b251 remains rejected, unexecuted, and preserved. No repair or further writer/retry is authorized.

## Evidence actually read

Read the entire native procedure and advisor report, facts02's relevant complete config/attribute/target/parent/before-image data, the Git restore probe02 record and source, the new native quarantine probe01 record and source, and the read-only inspector's relevant guard/evidence implementation. These were reads, not reviewer executions.

Pinned evidence identities stated by the procedure:

- `native-restoration-facts-02.json`: **005f949cc3c028088768b7ae9b1bd4e78b9f506bbf73919188fd368edcfae18f**.
- `native-git-restore-probe-02.json`: **d10a061bb2d45b7eeccf424dcdbfb58e7c60f226737439353c4c68df18675452**.
- BASE/HEAD: **52ac482a5b948d9d26df4c3a2617afec74d1cf54**.
- Recorded live raw index: **601b3f89f15e5009c4a551a13ba92d6ac2e6bcdbbf6471fdf80d75a47fa60f29**.
- `/usr/bin/git` Apple Git 2.54.0 / Apple Git-157: recorded binary SHA **34129c71a01a74f7f3b2443521519b2e5447553fa187f5fcafaaf8c42cc192e2**.

No checksum, probe, command, test, root write, source edit, delegation, premium call, or model/config/permission change was performed by this reviewer. This report is the sole new write. Parent-provided execution receipts are attributed evidence, not independently rerun results.

## Per-path Git compatibility assessment

### Bytes and exact scope

Facts02 records exactly **96 destinations: 15 CANDIDATE, 80 BEFORE, one absent ledger**. All **95** before-image records have `matches: true`. Each of the exact 15 has `beforeEqualsRawBase: true`, a raw BASE blob digest matching the archived before-image, regular `100644` BASE/index entries with identical object/mode, one stage-zero index row, and flags `H`. There is no measured per-path ambiguity, executable-mode mismatch, hardlink, ACL, sparse/skip/assume-unchanged condition requiring an override.

The native command has one literal leaf operand, explicit pinned source and worktree-only destination:

`GIT_OPTIONAL_LOCKS=0 rtk proxy /usr/bin/git --literal-pathspecs restore --source=52ac482a5b948d9d26df4c3a2617afec74d1cf54 --worktree -- <ONE EXACT PINNED PATH>`

This restores the approved raw preimage through the qualified checkout semantics; it does not derive authority from current staged ownership, reset/stage the index, select an entire directory, or operate on the other 80/ledger/metadata. Use no wildcard, path list, branch switch, force, skip-worktree override, stage selection, or root override.

### Checkout conversion and metadata

Facts02 reports all three effective attribute views—worktree, index, BASE—empty for the 15. `core.autocrlf=input`, no configured eol/safecrlf/attributesFile/fsmonitor/sparse-checkout extensions requiring a different command, and no CR in any of the 15 BASE payloads. The actual isolated probe uses autocrlf=input and copied `com.apple.provenance` data, restores LF before bytes, and records unchanged mode0644, raw index and stage entries plus identical before/after xattr values. Root targets all have the same measured provenance xattr digest, uid502/gid20/mode0644/nlink1/no ACL; immediate parents are mode0755/no ACL.

The probe's hooks override exists only in its fixture. It must not be imported into the root invocation. Root facts independently report no executable configured hooks. No new root configuration override is needed or approved.

Facts02 explicitly does not resolve system attribute-file provenance separately. With the same installed Git/environment and all three complete effective views still empty at the live guard, that is not an established unresolved checkout-conversion defect. Do not turn it into an unsupported claim that system files were inventoried. If the effective view/config/environment changes or cannot be established, HOLD rather than assume the probe applies.

### Index/environment preservation

Worktree-only spelling alone does not prove raw-index immutability; the isolated result does supply actual evidence for the selected installed-Git behavior. Fresh pre/post checks must still compare the entire raw index hash, NUL-delimited semantic rows and flags, including unrelated staged entries. Never relax raw equality to semantic equality or refresh/reset the index to make the check pass.

The inspected collector rejects unreviewed `GIT_*` variables (`inspect-native-restoration.mjs:13-16`), resolves worktree/gitDir/index location, and records config origins/values, attributes, flags, binary and filesystem metadata. Parent must preserve that reviewed invocation environment into the actual command—not merely observe it in a different subprocess—along with physical cwd, umask22 and the measured uid/gid. Absolute `/usr/bin/git` in the mutating command avoids an unreviewed PATH substitution. No environmental route to another index/worktree/config/attribute source is permitted.

## Mandatory fresh execution/evidence conditions

The following are conditions of this approval, not inferred completed steps:

1. **Before the first mutation:** retain and verify pinned audit/proof/archives, exact target set and all95 before-images; establish fresh 15candidate/80before/ledger-absent facts, source/helper/test and SDD preservation, physical topology, reviewed Git/environment/config/attribute/hook/binary state. Cooperating writers remain quiescent. Any mismatch means HOLD.
2. **Before each one-path restore:** compare the evolving expected state: earlier completed paths BEFORE, attempted next path CANDIDATE, future paths CANDIDATE, other80 BEFORE, ledger absent. Recheck that path's ancestor/leaf type, candidate digest, permissions/ownership/link count/ACL/xattrs, approved Git/index/config/attributes/environment conditions, and evidence-path containment. Preserve the previous fresh receipt rather than overwrite it.
3. **Intent first:** exclusively publish the exact path, ordinal, BASE, expected current/before digests and fresh precondition receipt path/hash. Intent is not an effect. If intent publication fails, do not invoke Git.
4. **Actual command one at a time, 60-second deadline:** record exit/output/tool response. Nonzero, timeout, lost response or interruption means effects unknown, never no-effect refusal. Do not automatically retry or issue the next restore.
5. **Post-command evidence:** fresh exclusive collector receipt plus explicit parent comparison of all state/metadata/index/HEAD/config invariants. Exit0 is insufficient. Record the actual attempted path's classification and known effects before declaring verification. Missing or failed evidence publication stops further writes; retain command transcripts and prior intents instead of discarding known effects.
6. **Inode treatment:** preserve parent identities/topology. Record Git's observed replacement-leaf inode as an effect fact; do not require the replaced file's old inode to survive a qualified Git restore. Do require bytes, uid/gid/mode/nlink/ACL/xattrs to meet the accepted postcondition. An unexplained foreign identity/topology change remains HOLD.
7. **After15:** independently verify all95 BEFORE, absent ledger, unchanged full index/HEAD/config, preserved canonical metadata/source and SDD. That is restoration evidence, not root generation/adoption completion.

The collector records facts rather than deciding eligibility. `matches` booleans, state counts and metadata must actually be compared by parent against the intent and evolving plan; writing a JSON file is not a passing guard. The current read-only collector's presence is not approval of an automated mutating loop or a new recovery framework.

## Exact native quarantine — concrete qualified operation

The late parent-supplied `native-quarantine-probe-01.json` records an isolated test of `/bin/mv -n` with an exact source directory and exact absent destination child, preserving source directory, payload and container dev/inode/mode/uid/gid/xattrs, payload hash and sole-child inventory, and observing source absence. Its collision control preserves an existing regular-file destination and leaves the source. Probe source confirms this is a same-device fixture, not the actual retained temporary. No live move is inferred.

The bounded actual command, **only after the conditions below are freshly established**, is:

`rtk proxy /bin/mv -n .agents/skills/common/common-subagent-driven-development/references/.ags-tmp-Ati9K9 artifacts/diagnostic-prevention/implementation/attempt-01/root-interrupted-temp-quarantine-01/.ags-tmp-Ati9K9`

Use the exact child destination—not an ambiguous container-only operand or a directory list. Required preparation:

- After the15 restoration verification, freshly lstat both full ancestor chains, exact source directory/payload and sole-child set; compare pinned device16777231, directory inode345126518/mode0700, payload inode345126519/mode0644/hash `0e1bad24d9b189a6007aa9905aea9f3ed327d4d98d180594ffd0be219c430a22`, plus owner/ACL/xattr facts.
- Require container path `A/root-interrupted-temp-quarantine-01` absent by lstat semantics. Create it exclusively with native `mkdir -m 700` and no `-p`; observe exact mode0700, owner, dev/inode and no unexpected contents. Creation is itself an artifact effect to record, not silently remove on later failure.
- Require container device equals source device, fresh regular directory topology, and the exact child absent—including refusal for a dangling symlink, existing file **or existing directory**. Exclusively publish the move intent and evidence before invoking `/bin/mv`.
- After invocation, verify original absent, exact child has the pinned directory/payload identities/hash/modes/sole-child/metadata, and created container identity/mode unchanged. Retain the actual move effect even if a later receipt/check fails. Final full95/index/config/HEAD/SDD check still follows.

**Important qualification limit:** the collision probe covers an existing regular file, not every existing-directory/nesting scenario. `/bin/mv -n` is not being approved as a hostile-writer atomic no-replace syscall or as safe for an existing directory operand. Under the accepted quiescent/cooperating-writer model, the fresh exact-child-absence guard is mandatory; any occupant means HOLD and no command. The procedure must not rely on `-n` alone to avoid nesting/merging. `mv -n` may exit0 on a skip; only observed source absence and exact destination identities define success. Same-device qualification and fresh topology/device guards exclude copy/delete fallback in the approved operating state; no cross-filesystem fallback is authorized.

With those constraints, no unresolved native primitive requires expanding or repairing the rejected operator. If parent cannot establish exact absent-child/same-device/quiescent conditions, keep the temporary untouched and report that precise gap; do not improvise another writer.

## Authority and completion limits

This is conditional procedure approval, not an agent-supplied human approval, command execution, actual restore PASS, quarantine PASS, R0 completion, R1 release, root reapply permission, source-corrective retry, or generation receipt. Parent separately owns the existing explicit user-approved exact restoration/quarantine and must evaluate fresh preconditions. Metadata/other80/ledger and unrelated user staged work remain outside mutating scope.

Only after actual complete restoration/quarantine and independent final verification may parent decide whether the already planned R1 gate is met; this report does not release it automatically. Subsequent Git batching/root-scale qualification/adoption/reapply remain separately gated. Preserve the custom operator and both rejection reviews as unexecuted evidence.

File standards routing returned no tier-eligible Markdown/JSON match; keyword loading refreshed common security audit/standards and best-practice guidance (also returning unrelated React Native security, which supplies no applicable recovery rule). Existing evidence/claim boundary guidance was retained. MCP compliance was audited; exact host cost unavailable. No Node20, host enforcement, complete task-cost or release claim is made.

**FINAL — scoped spec and quality/security APPROVE CONDITIONALLY for the reviewed native per-path procedure plus the exact qualified quarantine primitive and mandatory fresh guards. No actual root effect claimed. Reviewer frozen.**

## Supplementary comparison control received during final delivery

Parent message `36031fbb-a9f1-48b2-ac18-fbd982a9face` supplies the read-only `verify-native-restoration-facts.mjs` and reports an actual baseline count0 PASS plus count1 against the still-unrestored baseline FAIL on the first expected digest/state. This reviewer read the checker (`05D7`) but did not execute it.

The checker binds facts02 by full SHA, preserves the exact ordered15 paths, requires96 unique destinations, compares evolving restored-prefix digests/states, retains non-restored inodes, permits restored leaf inode replacement, compares full target/base/index/attribute metadata and all before-image records, and compares recorded parent/config/HEAD/raw-index/flags/binary/environment-relevant facts. It emits an exclusive comparison receipt bound to the input receipt hash and exits nonzero on differences. This is a useful additional rejection control, not an automatic mutation loop or fresh filesystem measurement.

Its result remains supplementary to the live collector, parent's explicit receipt review, separate SDD/source/evidence checks, and exact quarantine inspection; it does not inspect the retained temporary or quarantine container. A passing count15 receipt alone therefore cannot satisfy the final quarantine gate. The negative count1 control demonstrates rejection of an unperformed expected restoration, not executed restoration or historical RED. Conditional procedure approval and all limits above remain unchanged.
