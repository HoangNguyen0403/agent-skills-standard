# Native exact restoration — actual-evidence acceptance review round 1

## Separate scoped verdicts

- **Spec compliance: ACCEPT for the exact R0 recovery evidenced here.** The fifteen audited published-candidate destinations have been restored to their archived/BASE preimages; the other80 remain BEFORE; the ledger remains absent; the one retained temporary is preserved in its exact quarantine location.
- **Quality/security of recorded execution: ACCEPT within the reviewed cooperating-writer model.** The intent/result chain, post-state comparison controls, final root facts and exact quarantine identities support the bounded result. No consequential acceptance gap was established in the supplied evidence.
- **No generator PASS, Task1 completion, automatic R1 release, adoption/reapply permission, new writer/retry, or release approval follows.** Parent owns the next explicit phase decision and future qualification. The interrupted generation remains an interrupted non-completed event; restoring its known effects does not make its missing completion receipt exist.

This is an independent **read-only review of actual parent-produced evidence**, not reviewer execution. No commands, tests, root/source writes, probes, delegation, premium calls, model/config/permission changes or retries were performed by this reviewer. Only this report was written; old reviews/evidence remain preserved. The rejected b251 custom operator remains unexecuted and is not rehabilitated by the native result.

## Reviewed evidence and attribution

Read all fifteen `native-restore-intent-01.json` through `-15.json`, all fifteen `native-restoration-post-verification-01.json` through `-15.json`, and selected actual state data from **each** corresponding `native-restoration-post-01.json` through `-15.json`. Also read the live-pre facts, pinned effect-audit target map, final root facts and final verification, all quarantine pre/container/intent/post records, complete relevant quarantine inspector logic, invariant checker, and SDD result.

Parent message `88948c30-7660-4eae-ba66-29d375efd24c` supplies the execution attribution: fifteen individual one-path native Git commands and exact mkdir/mv commands exited0, with exclusive intents/results and checks observed. The retained state evidence below—not exit0 alone—is the acceptance basis. Reviewer did not execute commands or recalculate file hashes. Receipt hash bindings were inspected for consistency; they are parent-computed digests, not fresh reviewer checksums.

## Fifteen-path authority and effect chain

All fifteen intents have consecutive ordinals1–15, `intentOnly: true`, the same full BASE **52ac482a5b948d9d26df4c3a2617afec74d1cf54**, one exact audited path, expected candidate/before SHA256 values matching the pinned `PUBLISHED_CANDIDATE` audit map, and a precondition receipt path/hash. No metadata, ledger, extra directory, wildcard or unapproved sixteenth path appears.

Intent01 binds `native-restoration-live-pre-01.json` to the recorded facts02 digest **005f949cc3c028088768b7ae9b1bd4e78b9f506bbf73919188fd368edcfae18f**. Intents02–15 each bind the immediately preceding post receipt; each such digest matches the preceding verification's `inputSha256`. All post-verifications bind the same facts02 baseline, the expected restored count, `passed: true`, and `failures: []`.

| Ordinal | Exact target suffix under `.agents/skills/common/` | Observed BEFORE / CANDIDATE after command | Post comparison |
|---|---|---|---|
| 01 | `common-context-optimization/references/implementation.md` | 81 / 14 | PASS count1 |
| 02 | `common-decision-discipline/SKILL.md` | 82 / 13 | PASS count2 |
| 03 | `common-learning-log/SKILL.md` | 83 / 12 | PASS count3 |
| 04 | `common-learning-log/references/log-format.md` | 84 / 11 | PASS count4 |
| 05 | `common-security-standards/SKILL.md` | 85 / 10 | PASS count5 |
| 06 | `common-security-standards/references/VULNERABILITY_REMEDIATION.md` | 86 / 9 | PASS count6 |
| 07 | `common-security-standards/references/implementation.md` | 87 / 8 | PASS count7 |
| 08 | `common-session-retrospective/SKILL.md` | 88 / 7 | PASS count8 |
| 09 | `common-session-retrospective/references/methodology.md` | 89 / 6 | PASS count9 |
| 10 | `common-skill-creator/SKILL.md` | 90 / 5 | PASS count10 |
| 11 | `common-skill-creator/references/eval-workflow.md` | 91 / 4 | PASS count11 |
| 12 | `common-skill-creator/references/lifecycle.md` | 92 / 3 | PASS count12 |
| 13 | `common-skill-creator/references/testing.md` | 93 / 2 | PASS count13 |
| 14 | `common-subagent-driven-development/SKILL.md` | 94 / 1 | PASS count14 |
| 15 | `common-subagent-driven-development/references/methodology.md` | 95 / 0 | PASS count15 |

Each actual post-state read also retains the single `LEDGER_ABSENT`, unchanged full raw-index digest, and pinned HEAD. This is an evolving expected-prefix chain, not fifteen copies of a final total or an inference from command success.

The invariant checker (`05D7`) was inspected: it pins facts02, requires the exact ordered15 target paths and96 unique destinations, compares expected restored-prefix bytes/state versus future candidates, preserves mode/uid/gid/nlink/device and non-restored inode, compares target/base/index/attribute metadata, parents/config/HEAD/raw index/stages/flags/binary facts, and verifies all95 archived before-image records. It deliberately permits changed restored-leaf inodes while retaining non-restored identity. Its passing receipts therefore provide a materially stronger scope check than aggregate counts alone.

## Final root restoration result

`native-restoration-final-verification-01.json` records count15, PASS, no failures, and binds `native-restoration-final-01.json` to SHA256:

**b2881af2eb9fd821029f8a625138d87a1338348a9db3184e7b219c76dbd5b2f9**.

This equals the post15 input digest; the separately collected final facts are byte-identical in the supplied hash bindings. The final recorded state inspected is:

- **95 regular destinations BEFORE, zero CANDIDATE/OTHER, one absent ledger**.
- Full raw index **601b3f89f15e5009c4a551a13ba92d6ac2e6bcdbbf6471fdf80d75a47fa60f29**.
- Semantic index **b18fb3532bae14799fcf4e3d14c6f94004a9617ebc18bc7976a322e8d9a91387**.
- Flags **a5218a53c1a8ded1b27981a5dce50854b484fc592e671e550e14a6103b53474d**.
- HEAD remains the pinned BASE; physical worktree/gitDir/index locations remain the recorded worktree's locations.
- `.skillsrc` remains BASE/index/worktree-identical, digest **929d141803d4158e0f09ad1897944aa32dbf919fb353a17a9f7cc7246a2d889f**; `.skillsrc.yaml` remains absent in all three views.
- Effective worktree/index/BASE attribute views remain empty, autocrlf=input, fsmonitor/sparse settings unchanged, executable hook list empty.
- All15 targets retain mode0644, uid502/gid20, nlink1, no ACL and recorded `com.apple.provenance` xattr digest; before-image/raw-BASE equality remains true. Recorded parents retain mode0755, ownership, device/inode and no ACL.
- All95 before-images remain valid.
- Authored `skills/metadata.json` remains the original non-restored file: SHA **ae52f45b038e67d475b62aa956d6f2603f60983a554e974d6d4bb7315546724d**, inode343132273, mode0644, BEFORE. This matches facts02; no metadata reconstruction or version/date reset was substituted.

Parent separately reports final helper/test checksums unchanged at **7f2d8e75f4d41330961a1d4c6314b27042a6af6bd2500bc27261f47be568a612** and **9c028737ea2ca665da1b97ee9d31fec637afd2d4126ed9d6e9676459f2549b0e**. These are attributed parent checks, not additional reviewer executions or a complete new canonical-source inventory proof.

## Exact quarantine result

Reviewed `native-quarantine-pre-01.json`, `native-quarantine-container-01.json`, `native-quarantine-intent-01.json`, `native-quarantine-post-01.json`, and `inspect-native-quarantine.mjs` (`A4F3`).

- Pre receipt: PASS; source whole directory present with the pinned directory/payload identities, sole `payload`, absent container, freshly checked source/artifact ancestor chains.
- Container receipt: PASS; exclusive container **device16777231/inode345932246/mode0700/uid502/gid20**, no ACL, empty child set, exact destination child absent including symlink. Same device as source.
- Intent: exact approved source and exact child `A/root-interrupted-temp-quarantine-01/.ags-tmp-Ati9K9`, original directory inode345126518/payload345126519, container345932246, payload digest, and precondition receipt hash **ab3080feab16de58f0b0f37b1816a48c545839472f52b1d742c07fa130ea4b50**. It explicitly says exit0 alone is not success.
- Post receipt: PASS, no failures; original source absence is enforced by inspector `28`; quarantined directory remains **device16777231/inode345126518/mode0700/uid502/gid20**, sole child `payload`; payload remains **inode345126519/mode0644/uid502/gid20/nlink1** and SHA **0e1bad24d9b189a6007aa9905aea9f3ed327d4d98d180594ffd0be219c430a22**. Both retain their ACL/xattr facts.
- Container remains the created identity/mode/ownership/xattrs and has exactly the one moved directory child. Container nlink2→3 is explicitly checked as the expected one-directory insertion, not hidden by excluding all link-count differences. Source/container ancestor records compare equal across phases.

The inspector uses non-following lstat checks for directory/regular payload and fresh ancestor checks; byte hash, sole-child inventory and metadata are checked after the actual move, not inferred from `/bin/mv -n` status. It compares actual pre/container/post records. This supports exact whole-directory same-filesystem preservation, not copying/deleting the payload or a wildcard sweep. No hostile-writer atomicity or generic collision theorem is claimed.

## SDD, evidence and scope acceptance

`root-sdd-after-native-01.json` records **unchanged: true, archiveIntact: true, entries: 6**. This is parent-produced SDD verification evidence read by the reviewer, not a reviewer reconstruction of SDD entries. Prior audit/proof/candidate/source archives and rejected custom operator/reviews remain preserved per the supplied execution account; no source corrective or cleanup was requested in this review.

No material gap was found in the supplied exact-recovery evidence chain. Hashes/receipt fields and inspector logic were inspected, but command timing/order and exit0/tool transcripts are attributed to the parent execution witness; this review did not replay them or independently rehash live bytes. Acceptance is for the recorded recovery state and cooperating-writer procedure, not universal filesystem containment or assurance that no unmeasured unrelated file could ever change.

## Next gate remains parent-owned

**R0 exact restoration/quarantine evidence is acceptable.** This permits parent to evaluate its explicit R1 release gate; it does not itself release a writer or authorize any source changes. R1 batching semantics, representative root-scale apply/check, affected regression tests and independent review remain required before any new bounded root adoption/reapply. The original interrupted attempt still lacks normal completion, and no generation ownership ledger was invented.

No automatic retry, custom-operator repair, model substitution, premium, root generation PASS, original historical RED, Node20/host-enforcement claim, release or full-task completion is supplied. The 55 generator/1282 CLI results retain their previous revision/runtime scope; successful recovery does not extend them to unimplemented R1.

Project JavaScript/common/security guidance was refreshed/retained and MCP consultation audited. Session telemetry requested; exact host tokens/pricing unavailable. All prior reports preserved.

**FINAL — scoped actual-recovery spec and quality/security ACCEPT; fifteen restorations plus exact quarantine evidenced, no automatic R1 or regeneration release. Reviewer frozen.**
