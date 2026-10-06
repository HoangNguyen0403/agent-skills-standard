# Task 3 — Integrated Root-Test Cleanup Handoff

**Status: INCIDENTAL SPECIALIST SNAPSHOT GUARD REMOVED; parent root rerun pending.** Cleanup is limited to the authorized capability golden test and matching snapshot entry. No checks were run by this worker.

## Changed files

- `.github/skills/skill-creator/SKILL.md`
- `cli/src/services/utils/SpecialistTransformer.ts`
- `cli/src/services/utils/__tests__/SpecialistTransformer.spec.ts`
- `skills/common/common-subagent-driven-development/scripts/review_package.py`
- `skills/common/common-subagent-driven-development/scripts/test_review_package.py`
- `cli/src/services/__tests__/capabilityGolden.spec.ts`
- `cli/src/services/__tests__/__snapshots__/capabilityGolden.spec.ts.snap`
- `.agents/sdd/pr223-remediation/task-3-report.md`

## Test Intent Records

1. **Native permission-bearing specialist export metadata**
   - **Contract:** Cursor, Copilot, OpenCode, Gemini, and Kiro exports begin with native YAML frontmatter; the native metadata parses and the advisory warning follows the frontmatter.
   - **Fault:** Permission warning precedes `---`, causing native frontmatter parsers to treat metadata as body text.
   - **Layer/cases:** SpecialistTransformer unit; canonical L2 writing specialist across five YAML-export formats.
   - **Command:** `rtk pnpm --filter ./cli exec vitest run src/services/utils/__tests__/SpecialistTransformer.spec.ts`

2. **Staged deletion plus recreated tracked path**
   - **Contract:** BASE-relative package contains current replacement bytes, not a deletion-only representation; caller index tree remains byte-for-byte the same.
   - **Fault:** Tracked-diff/untracked overlap filtering omits the replacement or collection mutates the caller index.
   - **Layer/cases:** Isolated temporary Git repository; stage removal, recreate same path with new content, compare `git write-tree` before/after collection.
   - **Command:** `rtk python3 -m unittest skills.common.common-subagent-driven-development.scripts.test_review_package.TestReviewPackage.test_staged_deletion_with_recreated_file_includes_replacement_without_changing_index`

3. **Directory-target and dangling symlinks**
   - **Contract:** Both Git-valid link additions are packaged with mode `120000` and link-target text, without importing the linked directory's content; caller index tree remains unchanged.
   - **Fault:** Following existence checks reject valid links, dereference target contents, or alter the index.
   - **Layer/cases:** Isolated temporary Git repository; directory-target symlink plus dangling symlink, with secret sentinel in directory target.
   - **Command:** `rtk python3 -m unittest skills.common.common-subagent-driven-development.scripts.test_review_package.TestReviewPackage.test_directory_and_dangling_symlinks_are_packaged_as_link_text_without_dereference`

## RED evidence and repairs

- Parent-observed exporter RED: Vitest exit 1, 19 passed / 1 failed at `startsWith('---\\n')`. The former report command used `node --test`, which does not invoke this CLI's Vitest suite; replaced with the exact focused Vitest command above.
- Parent-observed package RED: `rtk python3 -m unittest discover -s skills/common/common-subagent-driven-development/scripts -p test_review_package.py` exited 1 (11 tests); recreated-file content was omitted and dangling-link collection exited 3. These match the intended regressions, not setup failures.
- Repair: specialist warnings now follow native YAML frontmatter; package collection builds a BASE-relative snapshot in a temporary alternate Git index and serializes ordinary files and symlinks through Git. The caller's index is not used or modified.
- Permission-bearing YAML coverage now parses frontmatter and checks native fields plus warning placement/risk disclosure. Removed the superseded warning-wording-only test; retained the no-warning-without-permission and Codex projection contracts.
- `metadata.internal: true` excludes the local maintenance skill from installer discovery without changing canonical inventory.
- Verification commands were not rerun. Parent owns GREEN, installer discovery, and integration checks. Existing Vite native-loader warning is unrelated and was not suppressed.

## Parent GREEN observations — follow-up test-contract correction

- Parent ran `rtk pnpm --filter ./cli exec vitest run src/services/utils/__tests__/SpecialistTransformer.spec.ts`: 18/18 passed.
- Parent ran `rtk python3 -m unittest discover -s skills/common/common-subagent-driven-development/scripts -p test_review_package.py`: 11 tests; symlink coverage passed. The replacement regression produced both `-initial a` and `+replacement content`, as required for a BASE-relative modification, then failed because the test incorrectly forbade the removed base line.
- Corrected that assertion to require `-initial a`; retained `+replacement content` and the caller-index-tree equality assertion. The prior failure occurred before the index equality assertion, so that invariant still requires the rerun.
- The collector output is correct for this scenario; no production change was made. This worker did not rerun tests/build/lint/formatters.

## T3-R2 Phase A — test-only

- Authoritative source: `.agents/sdd/pr223-remediation/task-3-independent-review.md:1-79`, v2. Current SPEC/QUALITY verdicts are CHANGES REQUESTED; NV-T3-1 is closed. T3-R2 is a separate source-established Major: replacing an owned tracked subtree with a regular file causes stale descendant `lstat` to raise `NotADirectoryError` before ordinary scoped Git staging.
- Parent-observed exact RED for NV-T3-1: `-k staged_new_file_ignored_after_staging`, one test failed in 0.49s because `+staged new content` was missing. This finding was closed by the scoped tracked-membership repair.
- Added `TestReviewPackage.test_directory_to_regular_file_replacement_packages_without_mutating_index` in `skills/common/common-subagent-driven-development/scripts/test_review_package.py`.
- **Test Intent Record:** Contract: with BASE and caller index tracking `owned/sub/file.txt`, replacing the worktree subtree with regular file `owned/sub` yields the old-path removal and replacement file content in the package, while preserving the caller's staged tree. Fault: stale tracked-descendant lookup aborts on `ENOTDIR` rather than allowing normal scoped Git staging. Layer/case: isolated temporary Git repository; directory-to-file transition under owned scope. Focused command: `rtk python3 -m unittest discover -s skills/common/common-subagent-driven-development/scripts -p test_review_package.py -k test_directory_to_regular_file_replacement`.
- Existing 12 Python cases remain. No tests/build/lint/format/generation were run in this phase.
- Parent evidence retained from review v2: actual native writer smoke passed in 1.57s, generating and validating 105 exports across five YAML formats; this closes the actual-export gap only. No native-host permission-enforcement claim.
- At Phase A handoff, no production change had been authorized. Parent RED confirmed T3-R2; Phase B below records the authorized correction.

## T3-R2 Phase B — narrow source correction

- Parent-observed RED: `rtk python3 -m unittest discover -s skills/common/common-subagent-driven-development/scripts -p test_review_package.py -k test_directory_to_regular_file_replacement` exited 1 in 0.39s with one `NotADirectoryError` (`errno 20`) at `os.lstat("owned/sub/file.txt")`. This confirms the predicted stale-descendant failure; no unrelated errors were reported.
- Changed only the stale tracked-leaf scan in `review_package.py`: it now treats `FileNotFoundError` and `NotADirectoryError` as absent paths, then lets the existing ordinary scoped `git add -A` capture the deleted descendant and replacement file.
- No broad `OSError` handler, forced directory add, real-index mutation, or other source change. All 13 isolated-Git tests and existing contracts remain.
- Parent owns the GREEN Python suite and immutable v3 review-package generation. This worker ran no tests/build/lint/format/generation.

## Integrated-root capability golden cleanup

- Parent observed integrated root test result: exit 1 in 3.25s, 1,254 passed and 1 failed. The only failure was the specialist-output byte snapshot requiring permission warnings before YAML frontmatter, which conflicts with the native-parsing contract.
- Removed the full `it('specialist outputs')` snapshot test, its now-unused `SpecialistTransformer` import and `SPECIALIST` fixture, and only the matching `capability golden (must never change during T3) > specialist outputs 1` snapshot entry (97 snapshot lines).
- The other five capability/MCP/hook test cases and their snapshot entries remain unchanged. Native YAML metadata/warning behavior remains covered by the 18 transformer cases and the parent-observed actual 105-export smoke.
- This is removal of an incidental formatting/wording guard, not snapshot regeneration or repinning. No production code changed. Parent owns the full root-chain rerun and fresh whole-change review.
