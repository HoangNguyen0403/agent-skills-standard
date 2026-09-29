# Implementation Plan: Open-source security remediation

## Goal

Remediate SEC-01 (skill installation can follow a pre-existing symlink outside the project) and SEC-03 (a distributed web-testing skill links an unrelated project's environment/credential instructions). Source report: [`srs-walkthrough-open-source-security-review.md`](../srs/srs-walkthrough-open-source-security-review.md). This is an exported local bug report, not a ticket or approved product requirement.

**Reproduction contract, not executed against a real target:** In a synthetic temporary project, create an installed-skill directory or destination-file symlink pointing to a second temporary directory; invoke the real local install writer with an in-memory skill payload. Current `SkillSyncService.isPathSafe` only resolves text (`cli/src/services/SkillSyncService.ts:472-475`), while `OwnershipWriter.write` checks `pathExists` then calls `fs.outputFile` (`cli/src/services/install/OwnershipWriter.ts:62-89,138-140`). The default passthrough writer also calls `fs.outputFile` (`OwnershipWriter.ts:18-21`). An existing symlink can therefore redirect a write despite lexical containment; this is a source-backed hypothesis pending a synthetic RED test, not a claim of observed exploitation. For SEC-03, `skills/quality-engineering/quality-engineering-playwright-cli/SKILL.md:80` links `references/project-context.md`, whose lines 19-97 direct editing `.env` and handling an unrelated test-credential archive.

**Expected behavior:** A skill installation refuses to read, overwrite, back up, or prune through a pre-existing symlink in an installed payload path; no outside file is changed, even with `--force` or adoption of unknown files. Normal owned-file sync and dry-run remain functional. The published Playwright skill must not include the unrelated-project operational reference. These expectations do not imply protection against a concurrently malicious process changing path components between checks; that requires host-enforced isolation beyond this CLI review.

**Root-cause hypothesis:** Existing path checks prevent textual `..` traversal but do not inspect filesystem entries. Both ownership and passthrough writers trust the resolved path and can follow symlinks. The unrelated reference was committed into the generic public skill package and linked as if applicable to every consuming project.

SNC: S=2 N=1 C=2 total=5 tier=high. `snc_tier: high`; `model_tier: strong`. Spread is across CLI installation and a distributed skill package; the CLI writer is a trust boundary. Independent architecture and security review required before merge. Approval of this plan is a HARD STOP before code.

Plan approval: user selected **Approve and implement** on 2026-09-29; this authorizes the two named local fix slices, not live probing, deployment, or a PR merge.

## Proposed Changes

1. **Payload boundary:** Add a shared project-root containment check for existing path components using `lstat` (including dangling final symlinks), fail closed before payload reads/writes and before prune/backup. Apply it in `cli/src/services/install/OwnershipWriter.ts` and its passthrough path. Update the installation callers in `cli/src/services/SkillSyncService.ts`, `WorkflowSyncService.ts`, `SpecialistSyncService.ts`, and `AgentBridgeService.ts` only as required to supply the actual installation root. Preserve ordinary project-root symlink invocation if possible; reject symlinks _inside_ the managed destination. Keep the current lexical traversal rejection. Audit backup destinations in `cli/src/services/install/BackupService.ts` for the same managed-path escape; do not implement a general filesystem sandbox.
2. **Regression evidence:** Add synthetic temp-directory behavioral cases to `cli/src/services/install/__tests__/OwnershipWriter.spec.ts` (symlinked parent, symlinked final file, dangling symlink, `--force`/adoption, prune, unchanged normal write, dry-run) and a focused `SkillSyncService` install-path test if required to cover the default writer. Test the absence of outside mutations as well as the rejection. Record Test Intent and observed RED before any production edit.
3. **Public guidance:** Remove the `Project Context` link from `skills/quality-engineering/quality-engineering-playwright-cli/SKILL.md` and remove `skills/quality-engineering/quality-engineering-playwright-cli/references/project-context.md` from the public package. Do not copy its credential-handling recipes into another public location. Recheck for callsites, emitted mirrors, package resources, and scanner warning.

The reference and link are also tracked in four generated install mirrors under `.agents/skills/`, `.claude/skills/`, `.codex/skills/`, and `.github/skills/`; the same cutover applies to those tracked copies. 4. **Documentation/handoff:** Update the existing security verification walkthrough with before/after evidence and `CHANGELOG.md` for the resulting fix. Touch `ARCHITECTURE.md`/`CONTRIBUTING.md` only if installation contract or authoring process actually changes. Do not rewrite historical walkthrough claims or create an unsupported compliance finding.

**Excluded:** SEC-02 feedback authentication, DTO limits, or token scope; intended anonymous-submission policy is unresolved and changing it could break callers. No production exercise, network probe, credential access, deployment, or arbitrary unrelated `fs` callsite rewrite. SEC-04 scanner match is not evidence of exfiltration; remove the unrelated reference rather than weakening the scanner.

## Task Slices

| Slice                | Scope                                                             | Verification                                                                                    |
| -------------------- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| CLI payload boundary | Writer, required root plumbing, backup path, CLI behavioral tests | Focused RED/GREEN tests, real local in-memory skill install to temporary directories, CLI suite |
| Public skill package | Remove linked cross-project reference and the reference file      | Skill validation, `audit:injection`, package resource/integration tests                         |

## Risks

- Symlink handling must not convert an unknown-file preservation path into an overwrite. Fail _before_ reading or backing up a symlink. Ensure dry-run describes the same policy without writing.
- `lstat` before `outputFile` alone cannot defeat a concurrent attacker swapping ancestors; host filesystem permissions and isolation remain required. Document this limit; do not claim absolute race-free containment.
- The public reference might be intentionally used in a separate private project. Removing it from this generic registry does not erase private copies; no private target or credential should be touched here.
- `git pull origin main` and a new worktree are deferred: this checkout has local verification material and branch/network operations are not prerequisites to planning. Do not overwrite local changes or create a PR without an issue/remote authorization.

## Verification Plan

Apply `common-tdd` (contract/fault/layer/cases/command) with focused, single-run Vitest tests and a temporary-project smoke that invokes the changed install surface without network. Follow with relevant CLI tests, `rtk pnpm audit:injection`, package validation, and documentation review. Evidence should establish that linked targets outside the temporary project are unchanged, that normal owned-file updates still work, and that the public skill no longer packages the cross-project instructions. Update `docs/srs/srs-walkthrough-open-source-security-review.md` with distinct before/after observations. No Playwright, server, or mobile driver applies.

## Review and Approval Gate

Request explicit approval for this **high-tier** plan, then run `implementation-readiness`. If READY or approved PARTIAL, create the SRS task list, delegate the two independent implementation slices per host delegation policy, integrate once, and seek independent architecture and security review before merge. Until approval: **plan only; no code, tests, or skill package changed**.

## Next Workflow

`implementation-readiness` after explicit plan approval.
