# Task: Open-source security remediation

## Scope

Approved high-tier `dev-fix` for SEC-01 installed-skill symlink containment and SEC-03 unrelated project-context guidance. Plan: [`prd-plan-open-source-security-remediation.md`](../prd/prd-plan-open-source-security-remediation.md). Implementation-readiness verdict: PARTIAL; SEC-02 feedback policy remains excluded.

## Checklist

- [x] Add a synthetic failing regression proving an installed payload cannot follow pre-existing symlinked parents or final files to an outside temporary directory; include force/adoption, prune, dangling links, normal writes, and dry-run behavior where distinct faults apply.
- [x] Guard the shared CLI install writer and required root plumbing; protect backup paths touched by the same operation without claiming concurrent-swap protection.
- [x] Remove `quality-engineering-playwright-cli`'s cross-project reference link and packaged file.
- [x] Run focused tests and real local in-memory install smoke, then relevant CLI suite, skill validation, injection audit, and independent security/architecture review.
- [x] Record observed before/after evidence in the existing security walkthrough and add a changelog entry.

## Decisions

The user selected **Approve and implement** on 2026-09-29. The signed-off slices are SEC-01 and SEC-03 only. No production, remote targets, GitHub issue creation, secrets, or unrelated endpoint changes.

## Evidence

Initial verification: 48 normal-path tests passed but did not prove symlink containment. RED backup destination tests and partial-package/split-agent cases failed before fixes; the final CLI tests passed 1251/1251 after removing obsolete mock-only assertions. Temporary-project package, backup, and two-agent smokes refused symlinks without outside changes or partial updates. The changed skill passed `pnpm validate`; build, lint, canonical and mirror injection scans completed. The broader mirror scan has one unrelated emoji U+200D warning. Typecheck still has diagnostics outside the changed guard/tests. Independent security and architecture re-reviews found the approved SEC-01/SEC-03 criteria met. Separate out-of-scope findings remain for backup restore sources, direct root `CLAUDE.md` writes, and unresolved SEC-02 feedback policy. See the walkthrough for commands and limits.

## Next Workflow

`verify-work` locally passed the approved SEC-01/SEC-03 criteria; see the verification decision in [`srs-walkthrough-open-source-security-review.md`](srs-walkthrough-open-source-security-review.md). Next: `code-review` and PR security checks, then human merge approval. SEC-02 and the backup/bridge risks remain separate.
