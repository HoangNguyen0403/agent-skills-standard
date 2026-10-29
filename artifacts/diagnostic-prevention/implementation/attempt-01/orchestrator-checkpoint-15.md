# Checkpoint 15 — actual native recovery executed; independent acceptance pending

## Known effects, not inferred from exit status

- Executed15separate native Git worktree-only restores, exact audit-selected paths, BASE52ac482a5b948d9d26df4c3a2617afec74d1cf54. Every call exit0; every call preceded an exclusive `native-restore-intent-NN.json`, followed fresh `native-restoration-post-NN.json` and passing `native-restoration-post-verification-NN.json`. No aggregate mutation loop, index/reset/staging/config override.
- All95destinations now match recorded before-images; active ledger remains absent. Final `native-restoration-final-01.json` SHA256 b2881af2eb9fd821029f8a625138d87a1338348a9db3184e7b219c76dbd5b2f9; `native-restoration-final-verification-01.json` PASS.
- Full raw index601b3f89f15e5009c4a551a13ba92d6ac2e6bcdbbf6471fdf80d75a47fa60f29, semantic rows/flags,HEAD/config/attrs/leafmodes/uidgid/linkcount/ACL/xattrs and parentidentities preserved. Other80originalleaves preserve their inodes. Replaced15leafinodes are not required unchanged; accepted byte/metadata postconditions all met.
- Created exactly `root-interrupted-temp-quarantine-01`, exclusive0700 under A, inode345932246/dev16777231. After fresh source/container/absent-child guards and exclusive intent, exact `/bin/mv -n` moved only inventoried `.ags-tmp-Ati9K9` to its exact child. `native-quarantine-post-01.json` PASS: original absent, originaldirinode345126518/payload345126519/dev16777231/modes/uidgid/xattrs/solepayload/digest preserved. Container inode preserved, expected directory linkcount2→3 recorded. No deletion or existing-destination merge.
- `root-sdd-after-native-01.json`: unchangedtrue/archiveIntacttrue/6entries.
- Final helper/test hashes remain7f2d8e75... and9c028737...; no performance implementation edits yet.

## Authority and review

Existing user-selected exact restore/fix/reapply authority used after conditional independent native-procedure approval. `root-native-restoration-procedure-review-round-1.md` approves exact primitive plus fresh guards, not actual outcomes. Parent asked separate actual-evidence review `root-native-restoration-execution-review-round-1.md`; pending at checkpoint creation. R1 batching implementation remains unreleased until that acceptance. Source customoperator b251 remains rejected/unexecuted; original attempt/proofs/archives preserved. No root generation receipt/RootPASS/adoption/reapply/release/Node20/host-enforcement claim.
