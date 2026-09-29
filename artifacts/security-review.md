# Security review: open-source security remediation

- Date: 2026-09-29
- Scope: local `fix/open-source-security-remediation` patch against `develop`; SEC-01 installed-skill destination symlink containment and SEC-03 public Playwright-skill reference removal. Source: local diff and synthetic temporary-project smoke, not live targets.
- Trust class: trusted local checkout and user-authorized PR publication; no PR comments, external instructions, credentials, or live exercise targets were used as instructions.
- Runtime mode: local filesystem checks and synthetic temporary-project install only. No live cyber-exercise authorization, host-enforced network/credential scope, or independent exercise ground truth was supplied. Live exercise and independent adjudication: **blocked / not-tested**.
- Accountable owner: repository maintainer for merge and risk acceptance. Review and PR checks are not product or security signoff.

## Findings and evidence

- **SEC-01 (confirmed locally remediated; pending PR review):** Installed package destinations previously followed pre-existing symlinks. Focused 42/42 CLI tests and a synthetic two-agent package/backup smoke passed; linked resource and backup destinations were refused without outside writes. `lstat` preflight does not cover concurrent filesystem swaps, backup-restore source/ID reads, or direct root `CLAUDE.md` writes.
- **SEC-03 (confirmed locally remediated; pending PR review):** Removed the unrelated project guidance reference link and file from the canonical Playwright skill and four install mirrors. Local skill validation and `pnpm audit:injection` passed.
- **SEC-02 (not-tested):** Anonymous feedback policy remains a separate decision, excluded from the approved implementation plan.
- **Toolchain advisory (suspected risk; not changed):** `pnpm audit --json` reports one moderate GHSA-p498-v437-472g for transitive `@humanfs/node@0.16.7` under eslint; `pnpm audit --prod` finds none. Dependency manifests and lockfile are unchanged. Track separately.

## PR gate

- Local: focused 42/42 CLI tests, full CLI 1251/1251 tests, CLI build, root lint, skill validation, and injection audit passed; `git diff --check` passed. `pnpm format:check` reports files outside this patch in CLI and MCP; changed files passed focused Prettier checks. See `docs/srs/srs-walkthrough-open-source-security-review.md` for the before/after reproduction and limits.
- GitHub CI secret scan (gitleaks), dependency review, and full matrix: **not-tested until PR runs**. No local gitleaks, semgrep, trufflehog, detect-secrets, or codeql executable was available. Do not infer a clean secrets or SAST result from their absence.
- Required next gate: review PR diff and CI results; human maintainer decides merge. Live authorization/adjudication and SEC-02 remain separate.
